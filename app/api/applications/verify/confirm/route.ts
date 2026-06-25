import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { issueVerificationToken } from '@/lib/verificationToken'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email(),
  departmentId: z.string().optional().nullable(),
  type: z.enum(['DEPARTMENT', 'FRANCHISE']),
  code: z.string().length(6),
})

const MAX_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { departmentId, type, code } = parsed.data
  const email = parsed.data.email.toLowerCase().trim()

  const record = await prisma.verificationCode.findFirst({
    where: { email, type, departmentId: departmentId ?? null, verified: false },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    return NextResponse.json(
      { error: 'No pending code found. Please request a new one.' },
      { status: 400 }
    )
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This code has expired. Please request a new one.' }, { status: 400 })
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Please request a new code.' },
      { status: 429 }
    )
  }

  if (record.code !== code.trim()) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
  }

  await prisma.verificationCode.update({ where: { id: record.id }, data: { verified: true } })

  const token = issueVerificationToken(email, type, departmentId ?? null)

  return NextResponse.json({ success: true, token })
}
