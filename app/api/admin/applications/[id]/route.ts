import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendStatusUpdateToDiscord } from '@/lib/discord'
import { z } from 'zod'

async function requireAuth() {
  const session = await auth()
  if (!session) return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const schema = z.object({ status: z.enum(['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'DENIED']) })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  const app = await prisma.application.findUnique({
    where: { id },
    include: { department: { select: { name: true } } },
  })
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.application.update({
    where: { id },
    data: { status: parsed.data.status },
  })
  sendStatusUpdateToDiscord(app.id, app.fullName, app.department?.name ?? 'Franchise Owner', app.status, parsed.data.status)
  return NextResponse.json({ success: true, status: updated.status })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.application.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
