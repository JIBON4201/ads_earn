import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('Seeding deposit settings and sample deposits...')

  const depositSettings = [
    { key: 'deposit_bkash_number', value: '01712345678' },
    { key: 'deposit_nagad_number', value: '01898765432' },
    { key: 'deposit_rocket_number', value: '01955443322' },
    { key: 'deposit_min_amount', value: '10' },
    { key: 'deposit_max_amount', value: '50000' },
    { key: 'deposit_auto_verify', value: 'true' },
    { key: 'deposit_expire_minutes', value: '30' },
  ]

  for (const s of depositSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
    console.log(`  Setting: ${s.key} = ${s.value}`)
  }

  const users = await prisma.botUser.findMany({ take: 5 })
  if (users.length < 3) {
    console.log('Not enough users to seed deposits')
    return
  }

  const now = Date.now()
  const sampleDeposits = [
    {
      userId: users[0].id,
      amount: 100,
      paymentMethod: 'bkash',
      senderNumber: '01711112222',
      transactionId: 'TXN8A3B2C1D',
      status: 'verified',
      verificationMethod: 'manual',
      adminNote: 'Verified by admin',
      requestedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(now - 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      processedBy: 'admin',
    },
    {
      userId: users[0].id,
      amount: 250,
      paymentMethod: 'nagad',
      senderNumber: '01711112222',
      transactionId: 'NAGD9X7K2M',
      status: 'auto_verified',
      verificationMethod: 'auto',
      requestedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      processedBy: 'system',
    },
    {
      userId: users[1].id,
      amount: 500,
      paymentMethod: 'bkash',
      senderNumber: '01822223333',
      transactionId: 'BKSH3M5N7P9',
      status: 'auto_verified',
      verificationMethod: 'auto',
      requestedAt: new Date(now - 1.5 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(now - 1.5 * 24 * 60 * 60 * 1000),
      processedBy: 'system',
    },
    {
      userId: users[1].id,
      amount: 1000,
      paymentMethod: 'rocket',
      senderNumber: '01822223333',
      transactionId: 'RKTX2L4K8R1',
      status: 'pending',
      verificationMethod: 'manual',
      requestedAt: new Date(now - 2 * 60 * 60 * 1000),
      expiresAt: new Date(now + 28 * 60 * 60 * 1000),
    },
    {
      userId: users[2].id,
      amount: 50,
      paymentMethod: 'nagad',
      senderNumber: '01933334444',
      transactionId: 'NGDQ5W8T3Y6',
      status: 'auto_verified',
      verificationMethod: 'auto',
      requestedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      processedBy: 'system',
    },
    {
      userId: users[2].id,
      amount: 2000,
      paymentMethod: 'bkash',
      senderNumber: '01933334444',
      transactionId: 'TXN4F7H9J2K',
      status: 'pending',
      verificationMethod: 'manual',
      requestedAt: new Date(now - 30 * 60 * 1000),
      expiresAt: new Date(now + 29.5 * 60 * 60 * 1000),
    },
    {
      userId: users[0].id,
      amount: 75,
      paymentMethod: 'rocket',
      senderNumber: '01711112222',
      transactionId: 'RKTM6N8P1Q3',
      status: 'rejected',
      verificationMethod: 'manual',
      adminNote: 'Invalid TrxID - no matching payment found',
      requestedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(now - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      processedBy: 'admin',
    },
    {
      userId: users[3]?.id || users[0].id,
      amount: 300,
      paymentMethod: 'bkash',
      senderNumber: '01644445555',
      transactionId: 'BKTX8R2T5V7',
      status: 'expired',
      verificationMethod: 'manual',
      adminNote: 'Expired - verification timeout',
      requestedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      processedBy: 'system',
    },
  ]

  for (const d of sampleDeposits) {
    const existing = await prisma.deposit.findFirst({
      where: { transactionId: d.transactionId },
    })
    if (!existing) {
      const deposit = await prisma.deposit.create({ data: d as any })

      if (d.status === 'verified' || d.status === 'auto_verified') {
        const user = await prisma.botUser.findUnique({ where: { id: d.userId } })
        if (user) {
          const newBalance = user.balance + d.amount
          await prisma.botUser.update({
            where: { id: d.userId },
            data: { balance: newBalance },
          })
          await prisma.transaction.create({
            data: {
              userId: d.userId,
              type: 'deposit',
              amount: d.amount,
              balanceAfter: newBalance,
              description: `Deposit via ${d.paymentMethod} (TrxID: ${d.transactionId})`,
              metadata: JSON.stringify({
                depositId: deposit.id,
                paymentMethod: d.paymentMethod,
                transactionId: d.transactionId,
                verificationMethod: d.verificationMethod,
              }),
              createdAt: d.verifiedAt || d.requestedAt,
            },
          })
        }
      }

      console.log(`  Deposit: ${d.amount} TK via ${d.paymentMethod} [${d.status}]`)
    }
  }

  console.log('Deposit seeding complete!')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
