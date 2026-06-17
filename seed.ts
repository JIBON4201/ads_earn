import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding database...')

  // Seed VIP Tiers
  // rewardPerAd is set so that minWithdrawal is reached in exactly N days:
  //   Free:      5 ads × 4.00 TK  × 1 day  = 20 TK
  //   Bronze:   10 ads × 2.50 TK  × 2 days = 50 TK
  //   Silver:   15 ads × 2.22 TK  × 3 days ≈ 100 TK
  //   Gold:     20 ads × 2.00 TK  × 5 days = 200 TK
  //   Platinum: 25 ads × 2.50 TK  × 4 days = 250 TK
  const vipTiers = [
    { level: 0, name: 'Free', price: 0, dailyAdLimit: 5, rewardBoost: 0, rewardPerAd: 4.00, minWithdrawal: 20, maxWithdrawals: 1, description: 'Free tier — 5 ads/day, 4 TK/ad, min withdrawal 20 TK (1 time only)', isActive: true },
    { level: 1, name: 'Bronze', price: 10, dailyAdLimit: 10, rewardBoost: 15, rewardPerAd: 2.50, minWithdrawal: 50, maxWithdrawals: 999, description: 'Bronze — 10 ads/day, 2.50 TK/ad, min withdrawal 50 TK', isActive: true },
    { level: 2, name: 'Silver', price: 100, dailyAdLimit: 15, rewardBoost: 30, rewardPerAd: 2.23, minWithdrawal: 100, maxWithdrawals: 999, description: 'Silver — 15 ads/day, 2.23 TK/ad, min withdrawal 100 TK', isActive: true },
    { level: 3, name: 'Gold', price: 500, dailyAdLimit: 20, rewardBoost: 50, rewardPerAd: 2.00, minWithdrawal: 200, maxWithdrawals: 999, description: 'Gold — 20 ads/day, 2.00 TK/ad, min withdrawal 200 TK', isActive: true },
    { level: 4, name: 'Platinum', price: 1000, dailyAdLimit: 25, rewardBoost: 70, rewardPerAd: 2.50, minWithdrawal: 250, maxWithdrawals: 999, description: 'Platinum — 25 ads/day, 2.50 TK/ad, min withdrawal 250 TK', isActive: true },
  ]

  for (const tier of vipTiers) {
    await prisma.vipTier.upsert({
      where: { level: tier.level },
      update: tier,
      create: tier,
    })
  }
  console.log('✅ VIP tiers seeded')

  // Seed System Settings
  const settings = [
    { key: 'bot_token', value: '' },
    { key: 'admin_telegram_ids', value: '[]' },
    { key: 'referral_bonus', value: '5' },
    { key: 'min_withdrawal', value: '50' },
    { key: 'withdrawal_auto_approve', value: 'false' },
    { key: 'max_accounts_per_device', value: '2' },
    { key: 'ad_watch_cooldown_seconds', value: '30' },
    { key: 'rate_limit_window_seconds', value: '60' },
    { key: 'rate_limit_max_actions', value: '10' },
    { key: 'fraud_alert_webhook', value: '' },
    { key: 'default_ad_reward', value: '1' },
    { key: 'platform_name', value: 'AdEarn Bot' },
    { key: 'support_channel', value: '' },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  console.log('✅ System settings seeded')

  // Seed Sample Ads (clear existing to avoid duplicates)
  await prisma.userAdWatch.deleteMany()
  await prisma.ad.deleteMany()
  
  const ads = [
    {
      title: 'Welcome Bonus Ad',
      description: 'Watch this ad to earn your first points!',
      url: 'https://example.com/ad1',
      rewardPoints: 1,
      requiredSeconds: 15,
      dailyLimit: 5,
      adType: 'cpm',
      priority: 10,
      isActive: true,
    },
    {
      title: 'Premium Offer',
      description: 'Complete this offer for bonus rewards',
      url: 'https://example.com/ad2',
      rewardPoints: 3,
      requiredSeconds: 30,
      dailyLimit: 3,
      adType: 'cpa',
      priority: 8,
      isActive: true,
    },
    {
      title: 'Daily Survey',
      description: 'Complete a short survey for points',
      url: 'https://example.com/ad3',
      rewardPoints: 2,
      requiredSeconds: 20,
      dailyLimit: 2,
      adType: 'sponsored',
      priority: 5,
      isActive: true,
    },
  ]

  for (const ad of ads) {
    await prisma.ad.create({ data: ad })
  }
  console.log('✅ Sample ads seeded')

  console.log('🎉 Seeding complete!')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())