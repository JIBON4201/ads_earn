import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Check if bot is configured with a token
    const botTokenSetting = await db.setting.findUnique({ where: { key: 'bot_token' } })
    const hasToken = botTokenSetting?.value && botTokenSetting.value !== '' && botTokenSetting.value !== 'YOUR_BOT_TOKEN_HERE'

    // In production, you would also check if the bot process is running
    // via a process manager or health check endpoint
    return NextResponse.json({
      online: hasToken,
      configured: hasToken,
      message: hasToken
        ? 'Bot is configured. Start the bot service to go online.'
        : 'Bot token not configured. Set it in Settings to enable the bot.',
    })
  } catch {
    return NextResponse.json({ online: false, configured: false, message: 'Could not check bot status' })
  }
}