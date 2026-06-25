import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ApplicationForm from '@/components/ApplicationForm'

type Props = { params: Promise<{ slug: string }> }

export default async function ApplyPage({ params }: Props) {
  const { slug } = await params
  const department = await prisma.department.findUnique({
    where: { slug },
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!department) notFound()
  if (!department.isOpen) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{department.name} — Closed</h1>
          <p className="text-zinc-400">{department.closedMessage || 'Applications are currently closed.'}</p>
        </div>
      </main>
    )
  }
  return <ApplicationForm department={department} />
}
