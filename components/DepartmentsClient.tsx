'use client'
import { useState } from 'react'

interface Question {
  id: string; label: string; placeholder: string; type: string;
  options: string[]; required: boolean; charLimit: number | null; sortOrder: number;
}
interface Department {
  id: string; name: string; slug: string; description: string; icon: string;
  isOpen: boolean; closedMessage: string; questions: Question[];
}

export default function DepartmentsClient({ departments: init }: { departments: Department[] }) {
  const [depts, setDepts] = useState<Department[]>(init)
  const [selected, setSelected] = useState<Department | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [editQ, setEditQ] = useState<Question | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const patchDept = async (id: string, data: Partial<Department>) => {
    setSaving(true)
    const res = await fetch(`/api/admin/departments/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setDepts(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d))
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...updated } : null)
      showToast('Saved')
    } else { showToast('Error saving') }
    setSaving(false)
  }

  const toggleOpen = (dept: Department) => patchDept(dept.id, { isOpen: !dept.isOpen })

  const patchQuestion = async (qid: string, data: Partial<Question>) => {
    setSaving(true)
    const res = await fetch(`/api/admin/questions/${qid}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setDepts(prev => prev.map(d => ({
        ...d,
        questions: d.questions.map(q => q.id === qid ? { ...q, ...updated } : q),
      })))
      if (selected) setSelected(prev => prev ? {
        ...prev,
        questions: prev.questions.map(q => q.id === qid ? { ...q, ...updated } : q),
      } : null)
      setEditQ(prev => prev?.id === qid ? { ...prev, ...updated } : prev)
      showToast('Question saved')
    }
    setSaving(false)
  }

  const deleteQuestion = async (qid: string) => {
    if (!confirm('Delete this question?')) return
    await fetch(`/api/admin/questions/${qid}`, { method: 'DELETE' })
    setDepts(prev => prev.map(d => ({ ...d, questions: d.questions.filter(q => q.id !== qid) })))
    if (selected) setSelected(prev => prev ? { ...prev, questions: prev.questions.filter(q => q.id !== qid) } : null)
    setEditQ(null)
    showToast('Question deleted')
  }

  const addQuestion = async (deptId: string) => {
    const res = await fetch('/api/admin/questions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId: deptId, label: 'New question', type: 'LONG_TEXT', required: true }),
    })
    if (res.ok) {
      const q = await res.json()
      setDepts(prev => prev.map(d => d.id === deptId ? { ...d, questions: [...d.questions, q] } : d))
      if (selected?.id === deptId) setSelected(prev => prev ? { ...prev, questions: [...prev.questions, q] } : null)
      showToast('Question added')
    }
  }

  return (
    <>
      <style>{`
        .dept-admin-wrap { display: grid; grid-template-columns: 280px 1fr; gap: 20px; height: calc(100vh - 110px); }
        .dept-list { background: var(--s1); border: 1px solid var(--b); border-radius: 11px; overflow-y: auto; }
        .dept-list-header { padding: 14px 16px; background: var(--s2); border-bottom: 1px solid var(--b);
          font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--tx2); }
        .dept-list-item { display: flex; align-items: center; gap: 10px; padding: 13px 16px;
          border-bottom: 1px solid var(--b2); cursor: pointer; transition: background .12s; }
        .dept-list-item:last-child { border-bottom: none; }
        .dept-list-item:hover { background: rgba(255,255,255,.02); }
        .dept-list-item.active { background: rgba(232,0,29,.07); border-right: 2px solid var(--red); }
        .dept-list-icon { font-size: 18px; flex-shrink: 0; }
        .dept-list-name { font-size: 13px; font-weight: 600; color: #fff; }
        .dept-list-status { font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          padding: 2px 6px; border-radius: 4px; margin-left: auto; flex-shrink: 0; }
        .dept-list-status.open { background: var(--gr-d); color: var(--gr); border: 1px solid rgba(24,212,100,.2); }
        .dept-list-status.closed { background: var(--s3); color: var(--mu); border: 1px solid var(--b); }
        .dept-detail { background: var(--s1); border: 1px solid var(--b); border-radius: 11px; overflow-y: auto; padding: 24px; }
        .dept-detail-empty { display: flex; align-items: center; justify-content: center; height: 100%;
          font-size: 14px; color: var(--mu); }
        .detail-section { margin-bottom: 28px; }
        .detail-section-title { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
          color: var(--mu); margin-bottom: 12px; font-family: 'JetBrains Mono', monospace;
          display: flex; align-items: center; gap: 8px; }
        .detail-section-title::after { content: ''; flex: 1; height: 1px; background: var(--b2); }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px;
          background: var(--s2); border: 1px solid var(--b); border-radius: 9px; }
        .toggle-label { font-size: 13px; font-weight: 600; color: var(--tx); }
        .toggle-desc { font-size: 11px; color: var(--mu); margin-top: 2px; }
        .toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; cursor: pointer; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-track { position: absolute; inset: 0; background: var(--s4); border-radius: 11px;
          transition: background .2s; border: 1px solid var(--b); }
        .toggle input:checked + .toggle-track { background: var(--red); border-color: var(--red); }
        .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: #fff;
          border-radius: 50%; transition: transform .2s; }
        .toggle input:checked ~ .toggle-thumb { transform: translateX(18px); }
        .field-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .field-lbl { font-size: 11px; font-weight: 600; color: var(--tx2); letter-spacing: .04em; }
        .field-inp { background: var(--s2); border: 1px solid var(--b); border-radius: 8px; color: var(--tx);
          font-size: 13px; font-family: 'Inter', sans-serif; padding: 9px 12px; outline: none;
          transition: border-color .15s; width: 100%; }
        .field-inp:focus { border-color: var(--red-edge); }
        .save-btn { background: var(--red); color: #fff; font-size: 12px; font-weight: 700;
          padding: 9px 20px; border-radius: 7px; border: none; cursor: pointer; transition: all .15s; }
        .save-btn:hover:not(:disabled) { background: #c8001a; }
        .save-btn:disabled { opacity: .6; cursor: not-allowed; }
        .q-list { display: flex; flex-direction: column; gap: 8px; }
        .q-card { background: var(--s2); border: 1px solid var(--b); border-radius: 9px; padding: 12px 14px;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; cursor: pointer; transition: border-color .15s; }
        .q-card:hover { border-color: rgba(255,255,255,.12); }
        .q-card.editing { border-color: var(--red-edge); }
        .q-label { font-size: 13px; color: var(--tx); line-height: 1.4; }
        .q-meta { font-size: 10px; color: var(--mu); margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
        .q-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .q-btn { background: var(--s3); border: 1px solid var(--b); border-radius: 6px; color: var(--mu);
          font-size: 11px; padding: 4px 10px; cursor: pointer; transition: all .13s; }
        .q-btn:hover { background: var(--s4); color: var(--tx); }
        .q-btn.del:hover { color: var(--red); border-color: rgba(232,0,29,.3); }
        .q-editor { background: var(--s3); border: 1px solid var(--b); border-radius: 10px; padding: 16px; margin-top: 8px; }
        .add-q-btn { width: 100%; padding: 10px; background: none; border: 1px dashed var(--b);
          border-radius: 9px; color: var(--mu); font-size: 13px; cursor: pointer; transition: all .15s; margin-top: 8px; }
        .add-q-btn:hover { border-color: rgba(255,255,255,.18); color: var(--tx); background: var(--s2); }
        .toast-fixed { position: fixed; bottom: 20px; right: 20px; background: var(--s3); border: 1px solid var(--b);
          border-left: 3px solid var(--gr); border-radius: 9px; padding: 11px 16px; font-size: 13px;
          color: #fff; z-index: 9999; animation: fadeUp .2s ease; }
        @media (max-width: 900px) { .dept-admin-wrap { grid-template-columns: 1fr; height: auto; } }
      `}</style>

      {toast && <div className="toast-fixed">✓ {toast}</div>}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: '.04em', color: '#fff' }}>Departments</div>
        <div style={{ fontSize: 12, color: 'var(--mu)', fontFamily: 'JetBrains Mono, monospace' }}>Manage application status and questions per department</div>
      </div>
      <div className="dept-admin-wrap">
        <div className="dept-list">
          <div className="dept-list-header">Departments</div>
          {depts.map(d => (
            <div key={d.id} className={`dept-list-item${selected?.id === d.id ? ' active' : ''}`} onClick={() => setSelected(depts.find(x => x.id === d.id) ?? null)}>
              <span className="dept-list-icon">{d.icon}</span>
              <span className="dept-list-name">{d.name}</span>
              <span className={`dept-list-status ${d.isOpen ? 'open' : 'closed'}`}>{d.isOpen ? 'Open' : 'Closed'}</span>
            </div>
          ))}
        </div>

        <div className="dept-detail">
          {!selected ? (
            <div className="dept-detail-empty">Select a department to manage</div>
          ) : (
            <>
              <div className="detail-section">
                <div className="detail-section-title">Applications</div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Accept Applications</div>
                    <div className="toggle-desc">{selected.isOpen ? 'Currently open — applicants can submit' : 'Currently closed'}</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={selected.isOpen} onChange={() => toggleOpen(selected)} disabled={saving} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Settings</div>
                <div className="field-row">
                  <label className="field-lbl">Closed Message</label>
                  <input className="field-inp" value={selected.closedMessage}
                    onChange={e => setSelected(prev => prev ? { ...prev, closedMessage: e.target.value } : null)}
                    placeholder="Message shown when closed…" />
                </div>
                <div className="field-row">
                  <label className="field-lbl">Description</label>
                  <input className="field-inp" value={selected.description}
                    onChange={e => setSelected(prev => prev ? { ...prev, description: e.target.value } : null)} />
                </div>
                <button className="save-btn" disabled={saving}
                  onClick={() => patchDept(selected.id, { closedMessage: selected.closedMessage, description: selected.description })}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Questions ({selected.questions.length})</div>
                <div className="q-list">
                  {selected.questions.map(q => (
                    <div key={q.id}>
                      <div className={`q-card${editQ?.id === q.id ? ' editing' : ''}`}
                        onClick={() => setEditQ(editQ?.id === q.id ? null : q)}>
                        <div>
                          <div className="q-label">{q.label}</div>
                          <div className="q-meta">{q.type.replace('_', ' ')} · {q.required ? 'Required' : 'Optional'}{q.charLimit ? ` · ${q.charLimit} chars` : ''}</div>
                        </div>
                        <div className="q-actions" onClick={e => e.stopPropagation()}>
                          <button className="q-btn" onClick={() => setEditQ(editQ?.id === q.id ? null : q)}>Edit</button>
                          <button className="q-btn del" onClick={() => deleteQuestion(q.id)}>Del</button>
                        </div>
                      </div>
                      {editQ?.id === q.id && (
                        <div className="q-editor">
                          <div className="field-row">
                            <label className="field-lbl">Question Label</label>
                            <input className="field-inp" value={editQ.label}
                              onChange={e => setEditQ(prev => prev ? { ...prev, label: e.target.value } : null)} />
                          </div>
                          <div className="field-row">
                            <label className="field-lbl">Type</label>
                            <select className="field-inp" value={editQ.type}
                              onChange={e => setEditQ(prev => prev ? { ...prev, type: e.target.value } : null)}>
                              {['SHORT_TEXT','LONG_TEXT','MULTIPLE_CHOICE','DROPDOWN','CHECKBOX'].map(t =>
                                <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                            </select>
                          </div>
                          {['MULTIPLE_CHOICE','DROPDOWN','CHECKBOX'].includes(editQ.type) && (
                            <div className="field-row">
                              <label className="field-lbl">Options (one per line)</label>
                              <textarea className="field-inp" rows={4}
                                value={editQ.options.join('\n')}
                                onChange={e => setEditQ(prev => prev ? { ...prev, options: e.target.value.split('\n') } : null)}
                                style={{ resize: 'vertical' }} />
                            </div>
                          )}
                          <div className="field-row">
                            <label className="field-lbl">Character Limit (optional)</label>
                            <input className="field-inp" type="number"
                              value={editQ.charLimit ?? ''} placeholder="No limit"
                              onChange={e => setEditQ(prev => prev ? { ...prev, charLimit: e.target.value ? parseInt(e.target.value) : null } : null)} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--tx2)' }}>
                              <input type="checkbox" checked={editQ.required}
                                onChange={e => setEditQ(prev => prev ? { ...prev, required: e.target.checked } : null)} />
                              Required
                            </label>
                          </div>
                          <button className="save-btn" disabled={saving}
                            onClick={() => patchQuestion(editQ.id, editQ)}>
                            {saving ? 'Saving…' : 'Save Question'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button className="add-q-btn" onClick={() => addQuestion(selected.id)}>+ Add Question</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
