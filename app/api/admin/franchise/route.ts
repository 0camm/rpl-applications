import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schema = z.object({
    isOpen: z.boolean().optional(),
    closedMessage: z.string().min(1).max(300).optional(),
  })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const config = await prisma.franchiseConfig.update({
    where: { id: 'singleton' },
    data: parsed.data,
  })
  return NextResponse.json(config)
}
