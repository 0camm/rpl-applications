import { prisma } from '@/lib/prisma'
import FranchiseConfigClient from '@/components/FranchiseConfigClient'
export const dynamic = 'force-dynamic'

export default async function FranchisePage() {
  const [config, questions] = await Promise.all([
    prisma.franchiseConfig.findUnique({ where: { id: 'singleton' } }),
    prisma.question.findMany({ where: { isFranchise: true }, orderBy: { sortOrder: 'asc' } }),
  ])
  return <FranchiseConfigClient
    config={JSON.parse(JSON.stringify(config))}
    questions={JSON.parse(JSON.stringify(questions))}
  />
}
