'use client'

import { useState, useMemo, useCallback } from 'react'

interface Answer { id: string; questionLabel: string; value: string }
interface Application {
  id: string; type: string; status: string; fullName: string;
  discordUsername: string; discordId: string; age: string; timezone: string;
  submittedAt: string;
  department: { name: string; slug: string; icon: string } | null
  answers: Answer[]
}
interface Dept { id: string; name: string; slug: string; icon: string }

const STATUS_OPTS = ['ALL', 'PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'DENIED']
const STATUS_COLORS: Record<string, string> = { PENDING: 'var(--am)', UNDER_REVIEW: 'var(--bl)', ACCEPTED: 'var(--gr)', DENIED: 'var(--lose)' }
const STATUS_BG: Record<string, string> = { PENDING: 'var(--am-d)', UNDER_REVIEW: 'var(--bl-d)', ACCEPTED: 'var(--gr-d)', DENIED: 'rgba(240,96,112,.09)' }

export default function ApplicationsClient({ applications: initial, departments }: { applications: Application[]; departments: Dept[] }) {
  const [apps, setApps] = useState<Application[]>(initial)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [selected, setSelected] = useState<Application | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  const filtered = useMemo(() => {
    let list = [...apps]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.fullName.toLowerCase().includes(q) ||
        a.discordUsername.toLowerCase().includes(q) ||
        a.discordId.includes(q) ||
        (a.department?.name ?? 'franchise').toLowerCase().includes(q)
      )
    }
    if (deptFilter !== 'ALL') list = list.filter(a => a.department?.slug === deptFilter || (deptFilter === 'franchise' && a.type === 'FRANCHISE'))
    if (statusFilter !== 'ALL') list = list.filter(a => a.status === statusFilter)
    if (typeFilter !== 'ALL') list = list.filter(a => a.type === typeFilter)
    list.sort((a, b) => sort === 'newest'
      ? new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      : new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    )
    return list
  }, [apps, search, deptFilter, statusFilter, sort, typeFilter])

  const updateStatus = useCallback(async (id: string, status: string) => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
      showToast(`Status updated to ${status.replace('_', ' ')}`)
    } catch {
      showToast('Failed to update status', 'error')
    } finally {
      setLoadingId(null)
    }
  }, [selected])

  const deleteApp = useCallback(async (id: string) => {
    if (!confirm('Delete this application? This cannot be undone.')) return
    setLoadingId(id)
    try {
      const res = await fetch(`/api/admin/applications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setApps(prev => prev.filter(a => a.id !== id))
      if (selected?.id === id) setSelected(null)
      showToast('Application deleted')
    } catch {
      showToast('Failed to delete', 'error')
    } finally {
      setLoadingId(null)
    }
  }, [selected])

  const exportCSV = () => {
    const rows = [
      ['ID', 'Type', 'Department', 'Full Name', 'Discord', 'Discord ID', 'Age', 'Timezone', 'Status', 'Submitted'],
      ...filtered.map(a => [
        a.id, a.type, a.department?.name ?? 'Franchise Owner',
        a.fullName, a.discordUsername, a.discordId, a.age, a.timezone,
        a.status, new Date(a.submittedAt).toISOString(),
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'rpl-applications.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`
        .apps-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 22px; flex-wrap: wrap; }
        .apps-title { font-family: 'Bebas Neue', sans-serif; font-size: 34px; letter-spacing: .04em; color: #fff; }
        .apps-count { font-size: 12px; color: var(--mu); font-family: 'JetBrains Mono', monospace; }
        .export-btn { display: inline-flex; align-items: center; gap: 7px; background: var(--s2);
          border: 1px solid var(--b); border-radius: 8px; color: var(--tx2); font-size: 12px; font-weight: 600;
          padding: 9px 16px; cursor: pointer; transition: all .15s; }
        .export-btn:hover { background: var(--s3); border-color: rgba(255,255,255,.12); color: #fff; }
        .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .fc { background: var(--s2); border: 1px solid var(--b); border-radius: 7px; color: var(--tx);
          font-size: 12px; font-family: 'Inter', sans-serif; padding: 7px 10px; outline: none;
          transition: border-color .15s; }
        .fc:focus { border-color: var(--red-edge); }
        .fc-search { min-width: 200px; flex: 1; }
        select.fc { padding-right: 26px; cursor: pointer; -webkit-appearance: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5'%3E%3Cpath fill='%2352526a' d='M0 0l4.5 5L9 0z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 8px center; background-color: var(--s2); }
        .app-table { background: var(--s1); border: 1px solid var(--b); border-radius: 11px; overflow: hidden; }
        .app-table-header { display: grid; grid-template-columns: 1fr 120px 100px 110px 90px; padding: 10px 16px;
          background: var(--s2); border-bottom: 1px solid var(--b); }
        .th { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--mu); }
        .app-row { display: grid; grid-template-columns: 1fr 120px 100px 110px 90px; padding: 11px 16px;
          align-items: center; border-bottom: 1px solid var(--b2); transition: background .12s; cursor: pointer; }
        .app-row:last-child { border-bottom: none; }
        .app-row:hover { background: rgba(255,255,255,.02); }
        .app-name { font-size: 13px; font-weight: 600; color: #fff; }
        .app-meta { font-size: 11px; color: var(--mu); margin-top: 1px; }
        .app-dept { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx2); }
        .app-date { font-size: 11px; color: var(--mu); font-family: 'JetBrains Mono', monospace; }
        .status-badge { display: inline-flex; font-size: 9px; font-weight: 700; letter-spacing: .08em;
          text-transform: uppercase; padding: 3px 8px; border-radius: 4px; white-space: nowrap; }
        .app-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .action-btn { background: var(--s3); border: 1px solid var(--b); border-radius: 6px;
          color: var(--mu); font-size: 11px; padding: 4px 10px; cursor: pointer; transition: all .13s; }
        .action-btn:hover { background: var(--s4); color: var(--tx); border-color: rgba(255,255,255,.1); }
        .action-btn.danger:hover { background: rgba(232,0,29,.12); color: var(--red); border-color: rgba(232,0,29,.3); }
        .empty-state { padding: 60px 20px; text-align: center; color: var(--mu); font-size: 14px; }
        /* Modal */
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.82); backdrop-filter: blur(10px);
          z-index: 500; display: flex; align-items: center; justify-content: center; padding: 16px;
          animation: fadeIn .2s ease; }
        .modal { background: var(--s1); border: 1px solid var(--b); border-radius: 14px; width: 100%;
          max-width: 680px; max-height: 88vh; display: flex; flex-direction: column;
          box-shadow: 0 28px 72px rgba(0,0,0,.8); position: relative; }
        .modal::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--red), transparent); border-radius: 14px 14px 0 0; }
        .modal-header { padding: 18px 20px; background: var(--s2); border-bottom: 1px solid var(--b);
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border-radius: 14px 14px 0 0; }
        .modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: .04em; color: #fff; }
        .modal-meta { font-size: 11px; color: var(--mu); margin-top: 3px; }
        .modal-close { background: var(--s3); border: 1px solid var(--b); border-radius: 7px; color: var(--mu);
          font-size: 15px; width: 30px; height: 30px; cursor: pointer; transition: all .13s;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .modal-close:hover { color: #fff; background: var(--s4); }
        .modal-body { overflow-y: auto; flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
        .info-card { background: var(--s2); border: 1px solid var(--b); border-radius: 9px; padding: 12px 14px; }
        .info-label { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
          color: var(--mu); margin-bottom: 5px; font-family: 'JetBrains Mono', monospace; }
        .info-val { font-size: 14px; color: #fff; font-weight: 500; }
        .status-select { background: var(--s2); border: 1px solid var(--b); border-radius: 8px;
          color: var(--tx); font-size: 13px; font-family: 'Inter', sans-serif; padding: 9px 30px 9px 12px;
          outline: none; cursor: pointer; -webkit-appearance: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5'%3E%3Cpath fill='%2352526a' d='M0 0l4.5 5L9 0z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center; }
        .status-select:focus { border-color: var(--red-edge); }
        .answers-list { display: flex; flex-direction: column; gap: 12px; }
        .answer-card { background: var(--s2); border: 1px solid var(--b); border-radius: 9px; padding: 12px 14px; }
        .answer-q { font-size: 11px; font-weight: 600; color: var(--tx2); margin-bottom: 6px; }
        .answer-a { font-size: 13px; color: var(--tx); line-height: 1.6; white-space: pre-wrap; }
        .modal-footer { padding: 14px 20px; border-top: 1px solid var(--b2); display: flex; align-items: center;
          justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .del-btn { background: none; border: 1px solid rgba(232,0,29,.25); color: var(--red); border-radius: 7px;
          font-size: 12px; font-weight: 600; padding: 8px 16px; cursor: pointer; transition: all .15s; }
        .del-btn:hover { background: rgba(232,0,29,.1); }
        .toast-fixed { position: fixed; bottom: 20px; right: 20px; background: var(--s3); border: 1px solid var(--b);
          border-radius: 9px; padding: 11px 16px; font-size: 13px; color: #fff; z-index: 9999;
          box-shadow: 0 10px 36px rgba(0,0,0,.6); animation: fadeUp .2s ease; }
        .toast-fixed.success { border-left: 3px solid var(--gr); }
        .toast-fixed.error { border-left: 3px solid var(--red); }
        @media (max-width: 768px) {
          .app-table-header { grid-template-columns: 1fr 80px; }
          .app-row { grid-template-columns: 1fr 80px; }
          .th:nth-child(2), .th:nth-child(3), .th:nth-child(4) { display: none; }
          .app-row > *:nth-child(2), .app-row > *:nth-child(3), .app-row > *:nth-child(4) { display: none; }
        }
      `}</style>

      {toast && <div className={`toast-fixed ${toast.type}`}>{toast.type === 'success' ? '✓ ' : '⚠ '}{toast.msg}</div>}

      <div className="apps-header">
        <div>
          <div className="apps-title">Applications</div>
          <div className="apps-count">{filtered.length} of {initial.length} shown</div>
        </div>
        <button className="export-btn" onClick={exportCSV}>↓ Export CSV</button>
      </div>

      <div className="filters">
        <input
          className="fc fc-search" placeholder="Search by name, Discord, or department…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="fc" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="DEPARTMENT">Staff</option>
          <option value="FRANCHISE">Franchise</option>
        </select>
        <select className="fc" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="ALL">All Departments</option>
          {departments.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}
          <option value="franchise">Franchise Owner</option>
        </select>
        <select className="fc" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>)}
        </select>
        <select className="fc" value={sort} onChange={e => setSort(e.target.value as 'newest' | 'oldest')}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="app-table">
        <div className="app-table-header">
          <span className="th">Applicant</span>
          <span className="th">Department</span>
          <span className="th">Status</span>
          <span className="th">Date</span>
          <span className="th" />
        </div>
        {filtered.length === 0 && <div className="empty-state">No applications match your filters</div>}
        {filtered.map(app => {
          const color = STATUS_COLORS[app.status]
          const bg = STATUS_BG[app.status]
          return (
            <div key={app.id} className="app-row" onClick={() => setSelected(app)}>
              <div>
                <div className="app-name">{app.fullName}</div>
                <div className="app-meta">{app.discordUsername} · {app.discordId}</div>
              </div>
              <div className="app-dept">
                {app.department?.icon ?? '🏆'}
                <span>{app.department?.name ?? 'Franchise'}</span>
              </div>
              <div>
                <span className="status-badge" style={{ background: bg, color, border: `1px solid ${color}30` }}>
                  {app.status.replace('_', ' ')}
                </span>
              </div>
              <div className="app-date">
                {new Date(app.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="app-actions" onClick={e => e.stopPropagation()}>
                <button className="action-btn" onClick={() => setSelected(app)}>View</button>
                <button className="action-btn danger" onClick={() => deleteApp(app.id)} disabled={loadingId === app.id}>Del</button>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="modal-bg" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selected.fullName}</div>
                <div className="modal-meta">
                  {selected.department?.name ?? 'Franchise Owner'} ·{' '}
                  Submitted {new Date(selected.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                {[
                  { label: 'Discord Username', val: selected.discordUsername },
                  { label: 'Discord ID', val: selected.discordId },
                  { label: 'Age', val: selected.age },
                  { label: 'Timezone', val: selected.timezone },
                  { label: 'Type', val: selected.type },
                  { label: 'Status', val: selected.status.replace('_', ' ') },
                ].map(({ label, val }) => (
                  <div key={label} className="info-card">
                    <div className="info-label">{label}</div>
                    <div className="info-val">{val}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--mu)', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                  Update Status
                </div>
                <select
                  className="status-select"
                  value={selected.status}
                  onChange={e => updateStatus(selected.id, e.target.value)}
                  disabled={loadingId === selected.id}
                >
                  <option value="PENDING">Pending</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="DENIED">Denied</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--mu)', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                  Responses
                </div>
                <div className="answers-list">
                  {selected.answers.length === 0 && <p style={{ color: 'var(--mu)', fontSize: 13 }}>No answers recorded</p>}
                  {selected.answers.map(a => (
                    <div key={a.id} className="answer-card">
                      <div className="answer-q">{a.questionLabel}</div>
                      <div className="answer-a">{a.value || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="del-btn" onClick={() => deleteApp(selected.id)}>Delete Application</button>
              <button className="action-btn" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
