import { prisma } from '@/lib/prisma'
import ApplicationsClient from '@/components/ApplicationsClient'

export const dynamic = 'force-dynamic'

export default async function ApplicationsPage() {
  const [applications, departments] = await Promise.all([
    prisma.application.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        department: { select: { name: true, slug: true, icon: true } },
        answers: true,
      },
    }),
    prisma.department.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  return (
    <ApplicationsClient
      applications={JSON.parse(JSON.stringify(applications))}
      departments={departments.map(d => ({ id: d.id, name: d.name, slug: d.slug, icon: d.icon }))}
    />
  )
}
