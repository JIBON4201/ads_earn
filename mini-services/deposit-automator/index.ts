import { Database } from 'bun:sqlite'

const dbPath = '/home/z/my-project/db/custom.db'
const db = new Database(dbPath)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

// Settings cache
let settingsCache: Record<string, string> = {}
let lastSettingsFetch = 0

function getSettings(): Record<string, string> {
  const now = Date.now()
  if (now - lastSettingsFetch < 30000 && Object.keys(settingsCache).length > 0) {
    return settingsCache
  }
  const rows = db.query(
    `SELECT key, value FROM Setting WHERE key IN (
      'deposit_auto_verify', 'deposit_verify_delay_seconds', 'deposit_max_verify_attempts',
      'deposit_auto_expire', 'deposit_expire_minutes', 'deposit_enabled'
    )`
  ).all() as { key: string; value: string }[]
  settingsCache = {}
  for (const r of rows) settingsCache[r.key] = r.value
  lastSettingsFetch = now
  return settingsCache
}

function getConfig(settings: Record<string, string>) {
  return {
    autoVerify: settings.deposit_auto_verify !== 'false',
    verifyDelaySeconds: parseInt(settings.deposit_verify_delay_seconds || '8'),
    maxVerifyAttempts: parseInt(settings.deposit_max_verify_attempts || '3'),
    autoExpire: settings.deposit_auto_expire !== 'false',
    enabled: settings.deposit_enabled !== 'false',
  }
}

// Simulate payment verification
function simulatePaymentVerification(
  trxId: string, amount: number
): { success: boolean; message: string; fraudScore: number } {
  let fraudScore = 0
  if (trxId.length < 8) fraudScore += 40
  if (/^(.)\1+$/.test(trxId)) fraudScore += 80
  if (/^(?:012|123|234|345|456|567|678|789|ABC|BCD|CDE|DEF)/.test(trxId)) fraudScore += 30
  if (amount >= 1000 && amount % 1000 === 0) fraudScore += 10
  if (amount > 10000) fraudScore += 15
  const isSuccess = fraudScore < 50 && Math.random() > 0.05
  if (isSuccess) {
    return { success: true, message: `Payment verified. Amount: ${amount} TK confirmed.`, fraudScore }
  }
  return {
    success: false,
    message: fraudScore >= 50 ? `High fraud score (${fraudScore}). Suspicious TrxID.` : `Verification inconclusive.`,
    fraudScore,
  }
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  for (const b of bytes) id += chars[b % chars.length]
  return id
}

function logAutomation(
  depositId: string, action: string, status: string, message: string, metadata?: string
) {
  db.query(
    `INSERT INTO DepositAutomationLog (id, depositId, action, status, message, metadata, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(generateId(), depositId, action, status, message, metadata || null)
}

function processPendingDeposits() {
  const settings = getSettings()
  const config = getConfig(settings)
  if (!config.enabled) return { processed: 0, verified: 0, expired: 0, failed: 0 }

  const nowISO = new Date().toISOString()
  let expiredCount = 0
  let verifiedCount = 0
  let failedCount = 0
  let processedCount = 0

  // 1. Auto-expire
  if (config.autoExpire) {
    const expired = db.query(
      `SELECT id, amount FROM Deposit WHERE status = 'pending' AND expiresAt IS NOT NULL AND expiresAt <= ?`
    ).all(nowISO) as { id: string; amount: number }[]

    for (const dep of expired) {
      db.query(
        `UPDATE Deposit SET status = 'expired', verifiedAt = ?, processedBy = 'system_auto',
         adminNote = 'Auto-expired — verification timeout' WHERE id = ?`
      ).run(nowISO, dep.id)
      logAutomation(dep.id, 'expired', 'warning', `Deposit expired. Amount: ${dep.amount} TK`)
      expiredCount++
    }
  }

  // 2. Process pending deposits
  const pending = db.query(
    `SELECT d.id, d.userId, d.amount, d.paymentMethod, d.senderNumber, d.transactionId,
            d.requestedAt, d.verificationAttempts, u.balance as userBalance
     FROM Deposit d JOIN BotUser u ON d.userId = u.id
     WHERE d.status = 'pending' AND d.expiresAt > ?
     ORDER BY d.requestedAt ASC LIMIT 20`
  ).all(nowISO) as {
    id: string; userId: string; amount: number; paymentMethod: string
    senderNumber: string; transactionId: string; requestedAt: string
    verificationAttempts: number; userBalance: number
  }[]

  for (const dep of pending) {
    const secondsSinceRequest = (Date.now() - new Date(dep.requestedAt).getTime()) / 1000
    if (secondsSinceRequest < config.verifyDelaySeconds) continue
    processedCount++

    // Mark as verifying
    db.query(
      `UPDATE Deposit SET status = 'verifying', verificationStartedAt = ?, verificationAttempts = verificationAttempts + 1
       WHERE id = ?`
    ).run(nowISO, dep.id)

    logAutomation(
      dep.id, 'verify_started', 'info',
      `Starting verification attempt #${dep.verificationAttempts + 1} for ${dep.amount} TK via ${dep.paymentMethod}`,
      JSON.stringify({ attempt: dep.verificationAttempts + 1, amount: dep.amount, method: dep.paymentMethod })
    )

    const result = simulatePaymentVerification(dep.transactionId, dep.amount)

    if (result.success && config.autoVerify) {
      const newBalance = dep.userBalance + dep.amount
      try {
        db.exec('BEGIN')
        db.query('UPDATE BotUser SET balance = ? WHERE id = ?').run(newBalance, dep.userId)

        db.query(
          `INSERT INTO Transaction (id, userId, type, amount, balanceAfter, description, metadata, createdAt)
           VALUES (?, ?, 'deposit', ?, ?, ?, ?, datetime('now'))`
        ).run(
          generateId(), dep.userId, dep.amount, newBalance,
          `Auto-deposit via ${dep.paymentMethod} (TrxID: ${dep.transactionId})`,
          JSON.stringify({ depositId: dep.id, paymentMethod: dep.paymentMethod, transactionId: dep.transactionId, verificationMethod: 'auto', fraudScore: result.fraudScore })
        )

        db.query(
          `UPDATE Deposit SET status = 'auto_verified', verificationMethod = 'auto', verifiedAt = ?, processedBy = 'system_auto',
           adminNote = ? WHERE id = ?`
        ).run(nowISO, result.message, dep.id)

        db.exec('COMMIT')
      } catch (e) {
        db.exec('ROLLBACK')
        logAutomation(dep.id, 'verify_failed', 'error', `Transaction error: ${e}`)
        db.query(`UPDATE Deposit SET status = 'pending' WHERE id = ?`).run(dep.id)
        failedCount++
        continue
      }

      logAutomation(
        dep.id, 'verify_success', 'success',
        `Deposit ${dep.amount} TK auto-verified. Balance: ${newBalance} TK. ${result.message}`,
        JSON.stringify({ newBalance, fraudScore: result.fraudScore })
      )
      verifiedCount++
    } else if (!result.success && dep.verificationAttempts + 1 >= config.maxVerifyAttempts) {
      db.query(
        `UPDATE Deposit SET status = 'failed', verifiedAt = ?, processedBy = 'system_auto',
         adminNote = ? WHERE id = ?`
      ).run(nowISO, `Auto-verification failed after ${config.maxVerifyAttempts} attempts. ${result.message}`, dep.id)
      logAutomation(dep.id, 'verify_failed', 'error', `Failed after max attempts. ${result.message}`)
      failedCount++
    } else if (!result.success) {
      db.query(
        `UPDATE Deposit SET status = 'pending', adminNote = ? WHERE id = ?`
      ).run(`Attempt ${dep.verificationAttempts + 1} failed: ${result.message}. Will retry.`, dep.id)
      logAutomation(dep.id, 'verify_failed', 'warning', `Attempt ${dep.verificationAttempts + 1} failed. Will retry.`)
      failedCount++
    }
  }

  return { processed: processedCount, verified: verifiedCount, expired: expiredCount, failed: failedCount }
}

// ========== HTTP SERVER ==========
const PORT = 3010

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
    try {
      if (path === '/health') {
        return Response.json({ status: 'running', timestamp: new Date().toISOString() }, { headers: corsHeaders })
      }
      if (path === '/stats' && req.method === 'GET') {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayISO = todayStart.toISOString()
        const row = db.query(
          `SELECT
            COUNT(*) as totalLogs,
            SUM(CASE WHEN createdAt >= ? THEN 1 ELSE 0 END) as todayLogs,
            SUM(CASE WHEN status = 'success' AND createdAt >= ? THEN 1 ELSE 0 END) as successToday,
            SUM(CASE WHEN status = 'error' AND createdAt >= ? THEN 1 ELSE 0 END) as errorsToday
           FROM DepositAutomationLog`
        ).get(todayISO, todayISO, todayISO) as { totalLogs: number; todayLogs: number; successToday: number; errorsToday: number }

        const recentLogs = db.query(
          `SELECT l.id, l.action, l.status, l.message, l.createdAt,
                  d.amount as depAmount, d.paymentMethod as depMethod, d.transactionId as depTrxId, d.status as depStatus,
                  u.firstName as userName, u.telegramId as userTelegramId
           FROM DepositAutomationLog l
           LEFT JOIN Deposit d ON l.depositId = d.id
           LEFT JOIN BotUser u ON d.userId = u.id
           ORDER BY l.createdAt DESC LIMIT 50`
        ).all()

        return Response.json({
          totalLogs: row.totalLogs, todayLogs: row.todayLogs,
          successToday: row.successToday, errorsToday: row.errorsToday,
          successRate: row.todayLogs > 0 ? Math.round((row.successToday / row.todayLogs) * 100) : 0,
          recentLogs: (recentLogs as Record<string, unknown>[]).map((r) => ({
            id: r.id, action: r.action, status: r.status, message: r.message, createdAt: r.createdAt,
            deposit: { amount: r.depAmount, paymentMethod: r.depMethod, transactionId: r.depTrxId, status: r.depStatus, user: r.userName ? { firstName: r.userName, telegramId: r.userTelegramId } : null },
          })),
        }, { headers: corsHeaders })
      }
      if (path === '/process' && req.method === 'POST') {
        const result = processPendingDeposits()
        return Response.json({ success: true, ...result }, { headers: corsHeaders })
      }
      if (path === '/pending-count' && req.method === 'GET') {
        const pending = db.query("SELECT COUNT(*) as c FROM Deposit WHERE status = 'pending'").get() as { c: number }
        const verifying = db.query("SELECT COUNT(*) as c FROM Deposit WHERE status = 'verifying'").get() as { c: number }
        return Response.json({ pending: pending.c, verifying: verifying.c }, { headers: corsHeaders })
      }
      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
    } catch (error) {
      console.error('Deposit automator error:', error)
      return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
    }
  },
})

// ========== MAIN LOOP ==========
function runAutomationCycle() {
  try {
    const result = processPendingDeposits()
    if (result.processed > 0 || result.expired > 0) {
      const ts = new Date().toISOString().slice(11, 19)
      console.log(`[${ts}] Processed: ${result.processed} | Verified: ${result.verified} | Expired: ${result.expired} | Failed: ${result.failed}`)
    }
  } catch (error) {
    console.error('Automation cycle error:', error)
  }
}

console.log(`🤖 Deposit Automator v2 started on port ${PORT}`)
console.log(`   Auto-verify: checking every 10 seconds`)
console.log(`   Health: http://localhost:${PORT}/health`)
console.log('')

runAutomationCycle()
setInterval(runAutomationCycle, 10_000)