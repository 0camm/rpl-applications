import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendApplicationToDiscord } from '@/lib/discord'
import { checkRateLimit, getClientIP, hashIP } from '@/lib/rateLimit'
import { z } from 'zod'

const AnswerSchema = z.object({
  questionId: z.string(),
  questionLabel: z.string(),
  value: z.string(),
})

const SubmissionSchema = z.object({
  type: z.enum(['DEPARTMENT', 'FRANCHISE']),
  departmentId: z.string().nullable().optional(),
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  discordUsername: z.string().min(2).max(40),
  discordId: z.string().regex(/^\d{17,20}$/, 'Invalid Discord ID'),
  age: z.string().min(1).max(3),
  timezone: z.string().min(1),
  answers: z.array(AnswerSchema),
})

function sanitize(str: string): string {
  return str.replace(/[<>]/g, '').trim()
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const ipHash = hashIP(ip)
  const { allowed } = await checkRateLimit(ipHash, 'submit_application', 3, 60 * 60 * 1000)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait before applying again.' },
      { status: 429 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = SubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid submission' }, { status: 400 })
  }

  const data = parsed.data
  const emailNorm = data.email.toLowerCase().trim()

  if (data.type === 'DEPARTMENT' && data.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } })
    if (!dept?.isOpen) return NextResponse.json({ error: 'This department is not accepting applications' }, { status: 403 })

    // Block duplicate active applications
    const active = await prisma.application.findFirst({
      where: { email: emailNorm, type: 'DEPARTMENT', departmentId: data.departmentId, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    })
    if (active) return NextResponse.json({ error: 'You already have an active application for this department.' }, { status: 409 })
  }

  if (data.type === 'FRANCHISE') {
    const config = await prisma.franchiseConfig.findUnique({ where: { id: 'singleton' } })
    if (!config?.isOpen) return NextResponse.json({ error: 'Franchise applications are not open' }, { status: 403 })

    const active = await prisma.application.findFirst({
      where: { email: emailNorm, type: 'FRANCHISE', status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    })
    if (active) return NextResponse.json({ error: 'You already have an active franchise application.' }, { status: 409 })
  }

  const ageNum = parseInt(data.age, 10)
  if (isNaN(ageNum) || ageNum < 10 || ageNum > 99) return NextResponse.json({ error: 'Invalid age' }, { status: 400 })

  let expectedQuestions: { id: string; required: boolean; charLimit: number | null }[] = []
  if (data.type === 'DEPARTMENT' && data.departmentId) {
    expectedQuestions = await prisma.question.findMany({ where: { departmentId: data.departmentId }, select: { id: true, required: true, charLimit: true } })
  } else if (data.type === 'FRANCHISE') {
    expectedQuestions = await prisma.question.findMany({ where: { isFranchise: true }, select: { id: true, required: true, charLimit: true } })
  }

  const answersMap = new Map(data.answers.map(a => [a.questionId, a.value]))
  for (const q of expectedQuestions) {
    const val = answersMap.get(q.id) ?? ''
    if (q.required && !val.trim()) return NextResponse.json({ error: 'All required fields must be completed' }, { status: 400 })
    if (q.charLimit && val.length > q.charLimit) return NextResponse.json({ error: `Response too long (max ${q.charLimit} chars)` }, { status: 400 })
  }

  const application = await prisma.application.create({
    data: {
      type: data.type,
      departmentId: data.departmentId ?? null,
      fullName: sanitize(data.fullName),
      email: emailNorm,
      discordUsername: sanitize(data.discordUsername),
      discordId: data.discordId,
      age: data.age,
      timezone: data.timezone,
      ipHash,
      answers: {
        create: data.answers.map(a => ({
          questionId: a.questionId,
          questionLabel: sanitize(a.questionLabel),
          value: sanitize(a.value),
        })),
      },
    },
    include: { department: true, answers: true },
  })

  sendApplicationToDiscord({
    id: application.id,
    type: application.type,
    departmentName: application.department?.name,
    fullName: application.fullName,
    discordUsername: application.discordUsername,
    discordId: application.discordId,
    age: application.age,
    timezone: application.timezone,
    answers: application.answers,
    submittedAt: application.submittedAt,
  })

  return NextResponse.json({ success: true, id: application.id }, { status: 201 })
}
