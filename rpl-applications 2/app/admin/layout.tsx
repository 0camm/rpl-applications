import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/admin/login')

  return (
    <>
      <style>{`
        .admin-shell { display: flex; min-height: 100vh; }
        .admin-content { flex: 1; margin-left: 220px; display: flex; flex-direction: column; min-height: 100vh; }
        .admin-main { flex: 1; padding: 28px; }
        @media (max-width: 900px) { .admin-content { margin-left: 0; } }
      `}</style>
      <div className="admin-shell">
        <AdminNav />
        <div className="admin-content">
          <main className="admin-main">{children}</main>
        </div>
      </div>
    </>
  )
}
