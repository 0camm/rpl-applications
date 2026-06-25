import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function requireAuth() {
  const session = await auth()
  return session ?? null
}

const DeptSchema = z.object({
  isOpen: z.boolean().optional(),
  closedMessage: z.string().min(1).max(300).optional(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(400).optional(),
  icon: z.string().max(10).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const parsed = DeptSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const dept = await prisma.department.update({
    where: { id: params.id },
    data: parsed.data,
  })
  return NextResponse.json(dept)
}
