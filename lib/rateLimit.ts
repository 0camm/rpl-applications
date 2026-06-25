import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { NextRequest } from 'next/server'

export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + (process.env.AUTH_SECRET ?? 'salt')).digest('hex')
}

export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  )
}

export async function checkRateLimit(
  ipHash: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)

  try {
    const record = await prisma.rateLimit.findUnique({
      where: { ipHash_action: { ipHash, action } },
    })

    if (!record || record.window < windowStart) {
      await prisma.rateLimit.upsert({
        where: { ipHash_action: { ipHash, action } },
        update: { count: 1, window: now },
        create: { ipHash, action, count: 1, window: now },
      })
      return { allowed: true, remaining: limit - 1 }
    }

    if (record.count >= limit) {
      return { allowed: false, remaining: 0 }
    }

    await prisma.rateLimit.update({
      where: { ipHash_action: { ipHash, action } },
      data: { count: { increment: 1 } },
    })

    return { allowed: true, remaining: limit - record.count - 1 }
  } catch {
    return { allowed: true, remaining: limit }
  }
}
