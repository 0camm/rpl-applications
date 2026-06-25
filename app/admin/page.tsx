import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const [total, byStatus, byDept, todayCount, weekCount, depts, franchise] = await Promise.all([
    prisma.application.count(),
    prisma.application.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.application.groupBy({ by: ['departmentId', 'type'], _count: { id: true } }),
    prisma.application.count({ where: { submittedAt: { gte: todayStart } } }),
    prisma.application.count({ where: { submittedAt: { gte: weekStart } } }),
    prisma.department.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.application.count({ where: { type: 'FRANCHISE' } }),
  ])

  const recent = await prisma.application.findMany({
    take: 8,
    orderBy: { submittedAt: 'desc' },
    include: { department: { select: { name: true, icon: true } } },
  })

  const statusMap = Object.fromEntries(byStatus.map(s => [s.status, s._count.id]))
  const deptCountMap = Object.fromEntries(
    byDept.filter(d => d.departmentId).map(d => [d.departmentId!, d._count.id])
  )

  return { total, statusMap, deptCountMap, todayCount, weekCount, depts, franchise, recent }
}

export default async function AdminDashboard() {
  const { total, statusMap, deptCountMap, todayCount, weekCount, depts, franchise, recent } = await getStats()

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'var(--am)',
    UNDER_REVIEW: 'var(--bl)',
    ACCEPTED: 'var(--gr)',
    DENIED: 'var(--lose)',
  }
  const STATUS_ICONS: Record<string, string> = {
    PENDING: '🟡', UNDER_REVIEW: '🔵', ACCEPTED: '✅', DENIED: '❌',
  }

  return (
    <>
      <style>{`
        .dash-header { margin-bottom: 28px; }
        .dash-title { font-family: 'Bebas Neue', sans-serif; font-size: 38px; letter-spacing: .04em; color: #fff; }
        .dash-sub { font-size: 12px; color: var(--mu); font-family: 'JetBrains Mono', monospace; margin-top: 4px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-bottom: 28px; }
        .stat-card { background: var(--s1); border: 1px solid var(--b); border-radius: 10px; padding: 18px 16px;
          position: relative; overflow: hidden; }
        .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--accent, var(--red)); }
        .stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 40px; letter-spacing: .04em;
          color: var(--accent, #fff); line-height: 1; }
        .stat-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
          color: var(--mu); margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
        .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .dash-card { background: var(--s1); border: 1px solid var(--b); border-radius: 12px; overflow: hidden; }
        .dash-card-header { padding: 14px 18px; background: var(--s2); border-bottom: 1px solid var(--b2);
          font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          color: var(--tx2); display: flex; align-items: center; justify-content: space-between; }
        .dash-card-body { padding: 16px; }
        .status-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0;
          border-bottom: 1px solid var(--b2); }
        .status-row:last-child { border-bottom: none; }
        .status-name { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--tx2); }
        .status-count { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 700; }
        .dept-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--b2); }
        .dept-row:last-child { border-bottom: none; }
        .dept-icon-sm { font-size: 14px; }
        .dept-info-sm { flex: 1; }
        .dept-name-sm { font-size: 12px; font-weight: 600; color: var(--tx); }
        .dept-open-badge { font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          padding: 2px 6px; border-radius: 4px; }
        .dept-open-badge.open { background: var(--gr-d); color: var(--gr); border: 1px solid rgba(24,212,100,.2); }
        .dept-open-badge.closed { background: var(--s3); color: var(--mu); border: 1px solid var(--b); }
        .dept-count-sm { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: var(--tx2); }
        .recent-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--b2); }
        .recent-row:last-child { border-bottom: none; }
        .recent-name { font-size: 13px; font-weight: 600; color: #fff; }
        .recent-meta { font-size: 11px; color: var(--mu); margin-top: 1px; }
        .recent-status { font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          padding: 2px 7px; border-radius: 4px; white-space: nowrap; }
        .view-all { font-size: 11px; color: var(--red); text-decoration: none; font-family: 'JetBrains Mono', monospace; }
        .view-all:hover { text-decoration: underline; }
        @media (max-width: 768px) { .dash-grid { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div className="dash-header">
        <div className="dash-title">Dashboard</div>
        <div className="dash-sub">Application Control Panel</div>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Total Applications', num: total, accent: 'var(--red)' },
          { label: "Today's Submissions", num: todayCount, accent: 'var(--bl)' },
          { label: 'This Week', num: weekCount, accent: 'var(--am)' },
          { label: 'Franchise Apps', num: franchise, accent: 'var(--gold)' },
          { label: 'Pending Review', num: statusMap.PENDING ?? 0, accent: 'var(--am)' },
          { label: 'Under Review', num: statusMap.UNDER_REVIEW ?? 0, accent: 'var(--bl)' },
          { label: 'Accepted', num: statusMap.ACCEPTED ?? 0, accent: 'var(--gr)' },
          { label: 'Denied', num: statusMap.DENIED ?? 0, accent: 'var(--lose)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-header">
            Applications by Status
          </div>
          <div className="dash-card-body">
            {(['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'DENIED'] as const).map(st => (
              <div key={st} className="status-row">
                <div className="status-name">
                  <span>{STATUS_ICONS[st]}</span>
                  {st.replace('_', ' ')}
                </div>
                <span className="status-count" style={{ color: STATUS_COLORS[st] }}>
                  {statusMap[st] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            Department Summary
            <Link href="/admin/departments" className="view-all">Manage →</Link>
          </div>
          <div className="dash-card-body">
            {depts.map(dept => (
              <div key={dept.id} className="dept-row">
                <span className="dept-icon-sm">{dept.icon}</span>
                <div className="dept-info-sm">
                  <div className="dept-name-sm">{dept.name}</div>
                </div>
                <span className={`dept-open-badge ${dept.isOpen ? 'open' : 'closed'}`}>
                  {dept.isOpen ? 'Open' : 'Closed'}
                </span>
                <span className="dept-count-sm">{deptCountMap[dept.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card" style={{ gridColumn: '1 / -1' }}>
          <div className="dash-card-header">
            Recent Submissions
            <Link href="/admin/applications" className="view-all">View all →</Link>
          </div>
          <div className="dash-card-body">
            {recent.length === 0 && <p style={{ color: 'var(--mu)', fontSize: 13 }}>No applications yet</p>}
            {recent.map(app => {
              const color = STATUS_COLORS[app.status]
              const bg = { PENDING: 'var(--am-d)', UNDER_REVIEW: 'var(--bl-d)', ACCEPTED: 'var(--gr-d)', DENIED: 'rgba(240,96,112,.09)' }[app.status]
              return (
                <div key={app.id} className="recent-row">
                  <span style={{ fontSize: 18 }}>{app.department?.icon ?? '🏆'}</span>
                  <div style={{ flex: 1 }}>
                    <div className="recent-name">{app.fullName}</div>
                    <div className="recent-meta">
                      {app.discordUsername} · {app.department?.name ?? 'Franchise Owner'} ·{' '}
                      {new Date(app.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="recent-status" style={{ background: bg, color, border: `1px solid ${color}30` }}>
                    {app.status.replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
