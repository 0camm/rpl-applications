import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAuth() {
  const session = await auth()
  if (!session) return null
  return session
}

export async function DELETE(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const confirm = req.nextUrl.searchParams.get('confirm')
  if (confirm !== 'true') return NextResponse.json({ error: 'Missing confirmation' }, { status: 400 })
  const { count } = await prisma.application.deleteMany({})
  return NextResponse.json({ success: true, count })
}
