import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || ''

  // If DATABASE_URL starts with "libsql://" → use Turso (production/Vercel)
  if (dbUrl.startsWith('libsql://')) {
    const authToken = process.env.DATABASE_AUTH_TOKEN || ''
    const libsql = createClient({
      url: dbUrl,
      authToken: authToken,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  // Otherwise → use local SQLite (development)
  return new PrismaClient()
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db