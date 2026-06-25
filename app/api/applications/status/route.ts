import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyVerificationToken } from '@/lib/verificationToken'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email(),
  departmentId: z.string().optional().nullable(),
  type: z.enum(['DEPARTMENT', 'FRANCHISE']),
  token: z.string(),
})

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { departmentId, type, token } = parsed.data
  const email = parsed.data.email.toLowerCase().trim()

  if (!verifyVerificationToken(token, email, type, departmentId ?? null)) {
    return NextResponse.json({ error: 'Email not verified or verification expired.' }, { status: 401 })
  }

  const existing = await prisma.application.findFirst({
    where: {
      email,
      type,
      ...(type === 'DEPARTMENT' && departmentId ? { departmentId } : {}),
    },
    orderBy: { submittedAt: 'desc' },
    select: { id: true, status: true, submittedAt: true, department: { select: { name: true } } },
  })

  if (!existing) return NextResponse.json({ hasApplication: false })

  // Allow resubmit if accepted or denied
  const canResubmit = existing.status === 'ACCEPTED' || existing.status === 'DENIED'

  return NextResponse.json({
    hasApplication: true,
    canResubmit,
    status: existing.status,
    submittedAt: existing.submittedAt,
    departmentName: existing.department?.name ?? 'Franchise Owner',
  })
}
