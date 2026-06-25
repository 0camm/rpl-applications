import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  departmentId: z.string().optional(),
  isFranchise: z.boolean().optional(),
  label: z.string().min(1).max(300),
  type: z.enum(['SHORT_TEXT','LONG_TEXT','MULTIPLE_CHOICE','DROPDOWN','CHECKBOX']).default('LONG_TEXT'),
  required: z.boolean().default(true),
  options: z.array(z.string()).default([]),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = Schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  // Get max sortOrder
  const last = await prisma.question.findFirst({
    where: parsed.data.isFranchise
      ? { isFranchise: true }
      : { departmentId: parsed.data.departmentId },
    orderBy: { sortOrder: 'desc' },
  })

  const q = await prisma.question.create({
    data: { ...parsed.data, sortOrder: (last?.sortOrder ?? -1) + 1 },
  })
  return NextResponse.json(q, { status: 201 })
}
