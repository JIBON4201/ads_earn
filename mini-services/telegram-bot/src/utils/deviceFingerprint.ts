import { createHash } from 'node:crypto';

/**
 * Generate a device fingerprint hash from available Telegram context.
 * In the Telegram bot context, we use telegramId + chatId as the base.
 * In production, this could be enhanced with Web App data.
 */
export function generateDeviceHash(telegramId: number, chatId: number | string): string {
  const raw = `${telegramId}:${chatId}:${telegramId % 1000}`;
  return createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

/**
 * Generate a more robust device hash if Web App data is available.
 */
export function generateEnhancedDeviceHash(
  telegramId: number,
  chatId: number | string,
  extraData?: Record<string, string>,
): string {
  const base = `${telegramId}:${chatId}`;
  const extra = extraData ? JSON.stringify(extraData) : '';
  return createHash('sha256').update(base + extra).digest('hex').substring(0, 32);
}