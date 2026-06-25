import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ApplicationForm from '@/components/ApplicationForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  if (slug === 'franchise') {
    return { title: 'Franchise Owner Application — RPL' }
  }
  const dept = await prisma.department.findUnique({ where: { slug } })
  return { title: `${dept?.name ?? 'Application'} — RPL` }
}

export default async function ApplyPage({ params }: Props) {
  const { slug } = await params

  if (slug === 'franchise') {
    const [config, questions] = await Promise.all([
      prisma.franchiseConfig.findUnique({ where: { id: 'singleton' } }),
      prisma.question.findMany({
        where: { isFranchise: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    if (!config?.isOpen) notFound()

    return (
      <ApplicationForm
        type="FRANCHISE"
        title="Franchise Owner Application"
        description="Apply to own and manage an NBA franchise in RPL Season 11."
        questions={questions}
        submitEndpoint="/api/applications"
        icon="🏆"
        accentColor="var(--gold)"
      />
    )
  }

  const dept = await prisma.department.findUnique({
    where: { slug },
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  })

  if (!dept) notFound()
  if (!dept.isOpen) notFound()

  return (
    <ApplicationForm
      type="DEPARTMENT"
      departmentId={dept.id}
      departmentSlug={dept.slug}
      title={dept.name}
      description={dept.description}
      questions={dept.questions}
      submitEndpoint="/api/applications"
      icon={dept.icon}
      accentColor="var(--red)"
    />
  )
}
