'use client'
import { useState } from 'react'

interface Question {
  id: string; label: string; placeholder: string; type: string;
  options: string[]; required: boolean; charLimit: number | null; sortOrder: number;
}
interface Config { id: string; isOpen: boolean; closedMessage: string }

export default function FranchiseConfigClient({ config: init, questions: initQ }: { config: Config; questions: Question[] }) {
  const [config, setConfig] = useState<Config>(init)
  const [questions, setQuestions] = useState<Question[]>(initQ)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [editQ, setEditQ] = useState<Question | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const saveConfig = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/franchise', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: config.isOpen, closedMessage: config.closedMessage }),
    })
    if (res.ok) { const d = await res.json(); setConfig(d); showToast('Saved') }
    else showToast('Error saving')
    setSaving(false)
  }

  const patchQuestion = async (qid: string, data: Partial<Question>) => {
    setSaving(true)
    const res = await fetch(`/api/admin/questions/${qid}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setQuestions(prev => prev.map(q => q.id === qid ? { ...q, ...updated } : q))
      setEditQ(prev => prev?.id === qid ? { ...prev, ...updated } : prev)
      showToast('Question saved')
    }
    setSaving(false)
  }

  const deleteQuestion = async (qid: string) => {
    if (!confirm('Delete this question?')) return
    await fetch(`/api/admin/questions/${qid}`, { method: 'DELETE' })
    setQuestions(prev => prev.filter(q => q.id !== qid))
    if (editQ?.id === qid) setEditQ(null)
    showToast('Deleted')
  }

  const addQuestion = async () => {
    const res = await fetch('/api/admin/questions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFranchise: true, label: 'New franchise question', type: 'LONG_TEXT', required: true }),
    })
    if (res.ok) { const q = await res.json(); setQuestions(prev => [...prev, q]); showToast('Added') }
  }

  return (
    <>
      <style>{`
        .fc-page { max-width: 700px; }
        .fc-title { font-family: 'Bebas Neue', sans-serif; font-size: 34px; letter-spacing: .04em; color: #fff; margin-bottom: 4px; }
        .fc-sub { font-size: 12px; color: var(--mu); font-family: 'JetBrains Mono', monospace; margin-bottom: 28px; }
        .card { background: var(--s1); border: 1px solid var(--b); border-radius: 11px; overflow: hidden; margin-bottom: 24px; }
        .card-hd { padding: 14px 18px; background: var(--s2); border-bottom: 1px solid var(--b);
          font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--tx2); }
        .card-bd { padding: 18px; }
        .toggle-row2 { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
          padding: 14px 16px; background: var(--s2); border: 1px solid var(--b); border-radius: 9px; }
        .toggle-label { font-size: 13px; font-weight: 600; color: var(--tx); }
        .toggle { position: relative; width: 40px; height: 22px; cursor: pointer; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-track { position: absolute; inset: 0; background: var(--s4); border-radius: 11px; transition: background .2s; border: 1px solid var(--b); }
        .toggle input:checked + .toggle-track { background: var(--gold); border-color: var(--gold); }
        .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: transform .2s; }
        .toggle input:checked ~ .toggle-thumb { transform: translateX(18px); }
        .field-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .field-lbl { font-size: 11px; font-weight: 600; color: var(--tx2); }
        .field-inp { background: var(--s2); border: 1px solid var(--b); border-radius: 8px; color: var(--tx);
          font-size: 13px; font-family: 'Inter', sans-serif; padding: 9px 12px; outline: none; transition: border-color .15s; width: 100%; }
        .field-inp:focus { border-color: rgba(201,168,76,.5); }
        .save-btn { background: var(--gold); color: #0a0a12; font-size: 12px; font-weight: 700;
          padding: 9px 20px; border-radius: 7px; border: none; cursor: pointer; transition: all .15s; }
        .save-btn:hover:not(:disabled) { background: #d4b257; }
        .save-btn:disabled { opacity: .6; cursor: not-allowed; }
        .q-card { background: var(--s2); border: 1px solid var(--b); border-radius: 9px; padding: 12px 14px;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; cursor: pointer; transition: border-color .15s; margin-bottom: 8px; }
        .q-card:hover { border-color: rgba(255,255,255,.12); }
        .q-card.editing { border-color: rgba(201,168,76,.5); }
        .q-label { font-size: 13px; color: var(--tx); }
        .q-meta { font-size: 10px; color: var(--mu); margin-top: 3px; font-family: 'JetBrains Mono', monospace; }
        .q-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .q-btn { background: var(--s3); border: 1px solid var(--b); border-radius: 6px; color: var(--mu);
          font-size: 11px; padding: 4px 10px; cursor: pointer; transition: all .13s; }
        .q-btn:hover { background: var(--s4); color: var(--tx); }
        .q-btn.del:hover { color: var(--red); border-color: rgba(232,0,29,.3); }
        .q-editor { background: var(--s3); border: 1px solid var(--b); border-radius: 10px; padding: 16px; margin-bottom: 8px; }
        .add-q-btn { width: 100%; padding: 10px; background: none; border: 1px dashed var(--b);
          border-radius: 9px; color: var(--mu); font-size: 13px; cursor: pointer; transition: all .15s; }
        .add-q-btn:hover { border-color: rgba(201,168,76,.4); color: var(--gold); }
        .toast-fixed { position: fixed; bottom: 20px; right: 20px; background: var(--s3); border: 1px solid var(--b);
          border-left: 3px solid var(--gr); border-radius: 9px; padding: 11px 16px; font-size: 13px; color: #fff; z-index: 9999; }
      `}</style>

      {toast && <div className="toast-fixed">✓ {toast}</div>}
      <div className="fc-page">
        <div className="fc-title">Franchise Config</div>
        <div className="fc-sub">Control franchise owner applications</div>

        <div className="card">
          <div className="card-hd">Application Status</div>
          <div className="card-bd">
            <div className="toggle-row2">
              <div>
                <div className="toggle-label">Accept Franchise Applications</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={config.isOpen}
                  onChange={e => setConfig(prev => ({ ...prev, isOpen: e.target.checked }))} />
                <div className="toggle-track" />
                <div className="toggle-thumb" />
              </label>
            </div>
            <div className="field-row">
              <label className="field-lbl">Closed Message</label>
              <input className="field-inp" value={config.closedMessage}
                onChange={e => setConfig(prev => ({ ...prev, closedMessage: e.target.value }))} />
            </div>
            <button className="save-btn" disabled={saving} onClick={saveConfig}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">Application Questions ({questions.length})</div>
          <div className="card-bd">
            {questions.map(q => (
              <div key={q.id}>
                <div className={`q-card${editQ?.id === q.id ? ' editing' : ''}`}
                  onClick={() => setEditQ(editQ?.id === q.id ? null : q)}>
                  <div>
                    <div className="q-label">{q.label}</div>
                    <div className="q-meta">{q.type.replace('_', ' ')} · {q.required ? 'Required' : 'Optional'}</div>
                  </div>
                  <div className="q-actions" onClick={e => e.stopPropagation()}>
                    <button className="q-btn" onClick={() => setEditQ(editQ?.id === q.id ? null : q)}>Edit</button>
                    <button className="q-btn del" onClick={() => deleteQuestion(q.id)}>Del</button>
                  </div>
                </div>
                {editQ?.id === q.id && (
                  <div className="q-editor">
                    <div className="field-row">
                      <label className="field-lbl">Label</label>
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
                      <label className="field-lbl">Char Limit</label>
                      <input className="field-inp" type="number" value={editQ.charLimit ?? ''} placeholder="No limit"
                        onChange={e => setEditQ(prev => prev ? { ...prev, charLimit: e.target.value ? parseInt(e.target.value) : null } : null)} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>
                      <input type="checkbox" checked={editQ.required}
                        onChange={e => setEditQ(prev => prev ? { ...prev, required: e.target.checked } : null)} />
                      Required
                    </label>
                    <button className="save-btn" disabled={saving} onClick={() => patchQuestion(editQ.id, editQ)}>
                      {saving ? 'Saving…' : 'Save Question'}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button className="add-q-btn" onClick={addQuestion}>+ Add Question</button>
          </div>
        </div>
      </div>
    </>
  )
}
