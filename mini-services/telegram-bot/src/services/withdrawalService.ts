import { prisma } from '../db.js';

export type PaymentMethod = 'bkash' | 'nagad' | 'rocket';

/**
 * Create a withdrawal request.
 */
export async function createWithdrawal(
  userId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  paymentNumber: string,
) {
  const user = await prisma.botUser.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  if (user.balance < amount) throw new Error('INSUFFICIENT_BALANCE');

  // Check minimum withdrawal
  const minSetting = await prisma.setting.findUnique({ where: { key: 'min_withdrawal' } });
  const minWithdrawal = minSetting ? parseFloat(minSetting.value) : 50;
  if (amount < minWithdrawal) throw new Error(`MIN_WITHDRAWAL:${minWithdrawal}`);

  // Validate payment number (basic check for Bangladeshi numbers)
  if (!/^01[3-9]\d{8}$/.test(paymentNumber)) {
    throw new Error('INVALID_PAYMENT_NUMBER');
  }

  // Deduct balance
  const newBalance = user.balance - amount;
  await prisma.botUser.update({
    where: { id: userId },
    data: { balance: newBalance },
  });

  // Create withdrawal
  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId,
      amount,
      paymentMethod,
      paymentNumber,
    },
  });

  // Log transaction
  await prisma.transaction.create({
    data: {
      userId,
      type: 'withdrawal',
      amount: -amount,
      balanceAfter: newBalance,
      description: `Withdrawal of ${amount} TK via ${paymentMethod} (${paymentNumber})`,
      metadata: JSON.stringify({ withdrawalId: withdrawal.id }),
    },
  });

  return { withdrawal, newBalance };
}

/**
 * Get minimum withdrawal amount.
 */
export async function getMinWithdrawal(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: 'min_withdrawal' } });
  return setting ? parseFloat(setting.value) : 50;
}