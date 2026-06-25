import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function guard() {
  const s = await auth(); return s ? true : false
}

const QuestionSchema = z.object({
  label: z.string().min(1).max(300).optional(),
  placeholder: z.string().max(200).optional(),
  type: z.enum(['SHORT_TEXT','LONG_TEXT','MULTIPLE_CHOICE','DROPDOWN','CHECKBOX']).optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  charLimit: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = QuestionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  const q = await prisma.question.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(q)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.question.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
