import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7)

  const [total, byStatus, todayCount, weekCount] = await Promise.all([
    prisma.application.count(),
    prisma.application.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.application.count({ where: { submittedAt: { gte: todayStart } } }),
    prisma.application.count({ where: { submittedAt: { gte: weekStart } } }),
  ])

  return NextResponse.json({
    total,
    byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.id])),
    today: todayCount,
    week: weekCount,
  })
}
