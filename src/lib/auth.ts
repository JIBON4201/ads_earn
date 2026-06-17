import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

// JWT secret — in production, load from env. Falls back to a dev secret.
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'adearn-dev-secret-key-change-in-production'
  return new TextEncoder().encode(secret)
}

const JWT_ALG = 'HS256'
const JWT_EXPIRY = '7d'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export interface AuthPayload {
  userId: string
  telegramId: number
  firstName: string
  lastName: string | null
  username: string | null
  vipLevel: number
}

/**
 * Verify Telegram WebApp initData using HMAC-SHA256.
 * Returns the parsed user object if valid, null otherwise.
 */
export async function verifyTelegramInitData(
  initData: string,
  botToken: string
): Promise<{ user: TelegramUser; auth_date: number } | null> {
  try {
    // Parse the init data string (key=value pairs separated by &)
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')

    if (!hash) {
      console.error('[Auth] No hash in initData')
      return null
    }

    // Remove hash from params to create the data-check-string
    params.delete('hash')

    // Sort remaining params alphabetically by key and join with \n
    const sortedKeys = Array.from(params.keys()).sort()
    const dataCheckString = sortedKeys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n')

    // Compute HMAC-SHA256 of data-check-string using bot token as key
    const secretKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(botToken),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      new TextEncoder().encode(dataCheckString)
    )

    // Compare hex strings
    const computedHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (computedHash !== hash) {
      console.error('[Auth] HMAC verification failed')
      return null
    }

    // Check auth_date is not too old (max 5 minutes)
    const authDate = parseInt(params.get('auth_date') || '0')
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 300) {
      console.error('[Auth] initData expired (auth_date too old)')
      return null
    }

    // Parse user from JSON
    const userStr = params.get('user')
    if (!userStr) {
      console.error('[Auth] No user in initData')
      return null
    }

    const user: TelegramUser = JSON.parse(userStr)

    return { user, auth_date: authDate }
  } catch (error) {
    console.error('[Auth] Error verifying initData:', error)
    return null
  }
}

/**
 * Sign a JWT with the user's auth payload.
 */
export async function signJWT(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJWTSecret())
}

/**
 * Verify a JWT and return the payload, or null if invalid.
 */
export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret(), {
      algorithms: [JWT_ALG],
    })
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

/**
 * Extract JWT from request.
 * Checks Authorization header first, then falls back to ?token= query param.
 * Returns null if no valid token found.
 */
export async function getAuthPayload(request: NextRequest): Promise<AuthPayload | null> {
  // Try Authorization header: Bearer <token>
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const payload = await verifyJWT(token)
    if (payload) return payload
  }

  // Try query param (for WebSocket/GET requests)
  const tokenParam = new URL(request.url).searchParams.get('token')
  if (tokenParam) {
    const payload = await verifyJWT(tokenParam)
    if (payload) return payload
  }

  return null
}

/**
 * Get the bot token from DB settings.
 */
export async function getBotToken(): Promise<string> {
  const { db } = await import('@/lib/db')
  const setting = await db.setting.findUnique({ where: { key: 'bot_token' } })
  return setting?.value || ''
}