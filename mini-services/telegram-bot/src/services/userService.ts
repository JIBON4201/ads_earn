import { prisma } from '../db.js';
import { generateDeviceHash } from '../utils/deviceFingerprint.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

interface RegisterUserInput {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  chatId: number | string;
  referredBy?: string;
  ipAddress?: string;
}

/**
 * Register a new user or return existing one.
 */
export async function registerUser(input: RegisterUserInput) {
  const existing = await prisma.botUser.findUnique({
    where: { telegramId: input.telegramId },
  });

  if (existing) {
    // Update username/name if changed
    if (existing.username !== input.username || existing.firstName !== input.firstName) {
      return prisma.botUser.update({
        where: { id: existing.id },
        data: {
          username: input.username,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });
    }
    return existing;
  }

  // Generate device hash
  const deviceHash = generateDeviceHash(input.telegramId, input.chatId);

  // Check device limit
  const device = await prisma.device.findUnique({ where: { deviceHash } });
  const maxAccountsSetting = await prisma.setting.findUnique({ where: { key: 'max_accounts_per_device' } });
  const maxAccounts = maxAccountsSetting ? parseInt(maxAccountsSetting.value, 10) : 2;

  if (device && device.accountCount >= maxAccounts) {
    throw new Error(`DEVICE_LIMIT:${device.accountCount}:${maxAccounts}`);
  }

  // Generate unique referral code
  let referralCode = uuidv4().substring(0, 8).toUpperCase();
  while (await prisma.botUser.findUnique({ where: { referralCode } })) {
    referralCode = uuidv4().substring(0, 8).toUpperCase();
  }

  // Validate referral
  let referredBy = input.referredBy;
  if (referredBy) {
    const referrer = await prisma.botUser.findUnique({ where: { referralCode: referredBy } });
    if (!referrer) {
      logger.warn(`Invalid referral code: ${referredBy}`);
      referredBy = undefined;
    }
    // Prevent self-referral
    if (referrer && referrer.telegramId === input.telegramId) {
      referredBy = undefined;
    }
  }

  // Upsert device
  if (device) {
    const telegramIds = JSON.parse(device.userTelegramIds) as number[];
    if (!telegramIds.includes(input.telegramId)) {
      telegramIds.push(input.telegramId);
      await prisma.device.update({
        where: { id: device.id },
        data: {
          accountCount: { increment: 1 },
          userTelegramIds: JSON.stringify(telegramIds),
        },
      });
    }
  } else {
    await prisma.device.create({
      data: {
        deviceHash,
        accountCount: 1,
        userTelegramIds: JSON.stringify([input.telegramId]),
      },
    });
  }

  // Create user
  const user = await prisma.botUser.create({
    data: {
      telegramId: input.telegramId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      deviceHash,
      ipAddress: input.ipAddress,
      referralCode,
      referredBy,
    },
  });

  // Credit referral bonus if applicable
  if (referredBy) {
    const referrer = await prisma.botUser.findUnique({ where: { referralCode: referredBy } });
    if (referrer) {
      const bonusSetting = await prisma.setting.findUnique({ where: { key: 'referral_bonus' } });
      const bonus = bonusSetting ? parseFloat(bonusSetting.value) : 5;

      await prisma.botUser.update({
        where: { id: referrer.id },
        data: {
          balance: { increment: bonus },
          totalEarned: { increment: bonus },
          referralCount: { increment: 1 },
        },
      });

      await prisma.transaction.create({
        data: {
          userId: referrer.id,
          type: 'referral_bonus',
          amount: bonus,
          balanceAfter: referrer.balance + bonus,
          description: `Referral bonus for inviting ${input.firstName} (@${input.username || 'unknown'})`,
          metadata: JSON.stringify({ newUserId: user.id, newTelegramId: input.telegramId }),
        },
      });

      logger.info(`Referral bonus ${bonus} credited to ${referrer.telegramId} for inviting ${input.telegramId}`);
    }
  }

  return user;
}

export async function getUserByTelegramId(telegramId: number) {
  return prisma.botUser.findUnique({ where: { telegramId } });
}

export async function getUserById(id: string) {
  return prisma.botUser.findUnique({ where: { id } });
}

export async function updateUserBalance(userId: string, amount: number) {
  return prisma.botUser.update({
    where: { id: userId },
    data: {
      balance: { increment: amount },
      totalEarned: amount > 0 ? { increment: amount } : undefined,
    },
  });
}