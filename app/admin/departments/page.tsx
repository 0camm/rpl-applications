import { prisma } from '@/lib/prisma'
import DepartmentsClient from '@/components/DepartmentsClient'
export const dynamic = 'force-dynamic'

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  })
  return <DepartmentsClient departments={JSON.parse(JSON.stringify(departments))} />
}
