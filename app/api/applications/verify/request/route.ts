import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/mailer'
import { checkRateLimit, getClientIP, hashIP } from '@/lib/rateLimit'
import crypto from 'crypto'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email(),
  departmentId: z.string().optional().nullable(),
  type: z.enum(['DEPARTMENT', 'FRANCHISE']),
})

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  const { departmentId, type } = parsed.data
  const email = parsed.data.email.toLowerCase().trim()

  // Rate limit code requests per-IP so the email can't be used to spam someone's inbox
  const ip = getClientIP(req)
  const ipHash = hashIP(ip)
  const { allowed } = await checkRateLimit(ipHash, 'request_verification', 5, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many code requests. Please wait a few minutes and try again.' },
      { status: 429 }
    )
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Invalidate any previous unverified codes for this email/context, then create a fresh one
  await prisma.verificationCode.deleteMany({
    where: { email, type, departmentId: departmentId ?? null, verified: false },
  })

  await prisma.verificationCode.create({
    data: { email, type, departmentId: departmentId ?? null, code, expiresAt },
  })

  let contextLabel = 'application'
  if (type === 'FRANCHISE') {
    contextLabel = 'Franchise Owner'
  } else if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } })
    contextLabel = dept?.name ?? 'application'
  }

  try {
    await sendVerificationEmail(email, code, contextLabel)
  } catch (err) {
    console.error('Failed to send verification email:', err)
    return NextResponse.json(
      { error: 'Could not send verification email. Please try again shortly.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true })
}
