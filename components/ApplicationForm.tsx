'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Question {
  id: string
  label: string
  placeholder: string
  type: string
  options: string[]
  required: boolean
  charLimit: number | null
  sortOrder: number
}

interface Props {
  type: 'DEPARTMENT' | 'FRANCHISE'
  departmentId?: string
  departmentSlug?: string
  title: string
  description: string
  questions: Question[]
  submitEndpoint: string
  icon: string
  accentColor: string
}

type AppStatus = 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'DENIED'

interface StatusResult {
  hasApplication: boolean
  canResubmit?: boolean
  status?: AppStatus
  submittedAt?: string
  departmentName?: string
}

const TIMEZONES = [
  'EST (UTC-5)', 'CST (UTC-6)', 'MST (UTC-7)', 'PST (UTC-8)',
  'BST (UTC+1)', 'CET (UTC+1)', 'EET (UTC+2)', 'GMT (UTC+0)',
  'AEST (UTC+10)', 'JST (UTC+9)', 'IST (UTC+5:30)', 'Other',
]

const STATUS_LABELS: Record<AppStatus, { label: string; color: string; icon: string; desc: string }> = {
  PENDING:      { label: 'Pending Review',  color: '#f5a623', icon: '⏳', desc: 'Your application is in the queue and has not been reviewed yet.' },
  UNDER_REVIEW: { label: 'Under Review',    color: '#5b9cf6', icon: '🔍', desc: 'Our team is currently reviewing your application.' },
  ACCEPTED:     { label: 'Accepted',        color: '#18d464', icon: '✅', desc: 'Your application was accepted! You may submit a new one if you wish.' },
  DENIED:       { label: 'Denied',          color: '#f06070', icon: '❌', desc: 'Your application was not accepted. You are welcome to apply again.' },
}

export default function ApplicationForm({
  type, departmentId, title, description, questions, submitEndpoint, icon, accentColor,
}: Props) {
  const [email, setEmail]               = useState('')
  const [emailError, setEmailError]     = useState('')
  const [sendingCode, setSendingCode]   = useState(false)

  const [step, setStep]                       = useState<'email' | 'code' | 'form'>('email')
  const [code, setCode]                       = useState('')
  const [codeError, setCodeError]             = useState('')
  const [verifying, setVerifying]             = useState(false)
  const [verificationToken, setVerificationToken] = useState('')

  // Cooldown shared by both initial send and resend
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [checkingStatus, setCheckingStatus] = useState(false)
  const [statusResult, setStatusResult]     = useState<StatusResult | null>(null)

  const [core, setCore]       = useState({ fullName: '', discordUsername: '', discordId: '', age: '', timezone: '' })
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [toast, setToast]           = useState<{ msg: string; type: 'error' | 'success' } | null>(null)

  // Clean up cooldown timer on unmount
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }, [])

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  const startCooldown = (seconds = 60) => {
    setResendCooldown(seconds)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  /**
   * Low-level: POST to the verify/request endpoint.
   * Does NOT touch step state — callers decide what to do with the result.
   */
  const requestCode = async (emailToSend: string): Promise<boolean> => {
    setSendingCode(true)
    try {
      const res = await fetch('/api/applications/verify/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSend, departmentId, type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not send verification code.')
      return true
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not send verification code. Please try again.')
      return false
    } finally {
      setSendingCode(false)
    }
  }

  // Step 1 → 2: validate email, send code, advance step
  const sendCode = async () => {
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setEmailError('')

    const ok = await requestCode(trimmed)
    if (ok) {
      setStep('code')
      setCode('')
      setCodeError('')
      startCooldown(60)
      showToast('Verification code sent — check your inbox.', 'success')
    }
  }

  /**
   * Resend from code step.
   * Uses requestCode directly — does NOT call sendCode (which would re-validate
   * the email field and reset the step, causing a double-fire on the rate limiter).
   */
  const resendCode = async () => {
    if (resendCooldown > 0 || sendingCode) return
    const ok = await requestCode(email.trim())
    if (ok) {
      setCode('')
      setCodeError('')
      startCooldown(60)
      showToast('New code sent — check your inbox.', 'success')
    }
  }

  /**
   * Go back to email step without sending a new code.
   * Clears cooldown so the next send on step 1 starts fresh.
   */
  const goBackToEmail = () => {
    setStep('email')
    setCode('')
    setCodeError('')
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    setResendCooldown(0)
  }

  // Step 2 → 3: verify code, check existing application status
  const confirmCode = async () => {
    const trimmed = code.trim()
    if (!/^\d{6}$/.test(trimmed)) {
      setCodeError('Enter the 6-digit code from your email.')
      return
    }
    setCodeError('')
    setVerifying(true)
    try {
      const res = await fetch('/api/applications/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), departmentId, type, code: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Incorrect code.')

      setVerificationToken(data.token)
      setCheckingStatus(true)

      const statusRes = await fetch('/api/applications/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), departmentId, type, token: data.token }),
      })
      const statusData: StatusResult = await statusRes.json()
      setStatusResult(statusData)
      setStep('form')
    } catch (err: unknown) {
      setCodeError(err instanceof Error ? err.message : 'Incorrect code. Please try again.')
    } finally {
      setVerifying(false)
      setCheckingStatus(false)
    }
  }

  const setAnswer = (qid: string, val: string | string[]) => {
    setAnswers(p => ({ ...p, [qid]: val }))
    setErrors(p => { const n = { ...p }; delete n[qid]; return n })
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!core.fullName.trim())        errs.fullName        = 'Full name is required.'
    if (!core.discordUsername.trim()) errs.discordUsername = 'Discord username is required.'
    if (!core.discordId.trim())       errs.discordId       = 'Discord ID is required.'
    if (!/^\d{17,20}$/.test(core.discordId.trim())) errs.discordId = 'Discord ID must be 17–20 digits.'
    if (!core.age.trim())             errs.age             = 'Age is required.'
    const ageNum = parseInt(core.age, 10)
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 99) errs.age = 'Enter a valid age.'
    if (!core.timezone)               errs.timezone        = 'Select your timezone.'

    for (const q of questions) {
      if (!q.required) continue
      const val = answers[q.id]
      if (q.type === 'CHECKBOX') {
        if (!Array.isArray(val) || val.length === 0) errs[q.id] = 'Select at least one option.'
      } else {
        if (!val || String(val).trim() === '') errs[q.id] = 'This field is required.'
      }
      if (q.charLimit && typeof val === 'string' && val.length > q.charLimit) {
        errs[q.id] = `Maximum ${q.charLimit} characters.`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { showToast('Please fix the errors below before submitting.'); return }
    setSubmitting(true)
    const payload = {
      type,
      departmentId: departmentId ?? null,
      email: email.trim().toLowerCase(),
      verificationToken,
      ...core,
      answers: questions.map(q => ({
        questionId:    q.id,
        questionLabel: q.label,
        value: Array.isArray(answers[q.id])
          ? (answers[q.id] as string[]).join(', ')
          : (answers[q.id] as string ?? ''),
      })),
    }
    try {
      const res = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed.')
      setSubmitted(true)
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submitted ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <>
        <FormStyles accentColor={accentColor} />
        <NavBar />
        <div className="form-page">
          <div className="success-wrap">
            <div className="success-icon">✓</div>
            <h1 className="success-title">Application Submitted</h1>
            <p className="success-sub">
              Your application for <strong style={{ color: '#fff' }}>{title}</strong> has been received.
              Check back using your email to track your status.
            </p>
            <Link href="/" className="btn-back">← Back to Applications</Link>
          </div>
        </div>
      </>
    )
  }

  // ── Step 1: Email gate ────────────────────────────────────────────────────────
  if (step === 'email') {
    return (
      <>
        <FormStyles accentColor={accentColor} />
        <NavBar />
        <div className="form-page">
          <Toast toast={toast} />
          <div className="form-hero">
            <span className="form-icon">{icon}</span>
            <div>
              <div className="form-eyebrow">
                {type === 'FRANCHISE' ? 'Franchise Owner Application' : 'Staff Application'}
              </div>
              <h1 className="form-title">{title}</h1>
              <p className="form-desc">{description}</p>
            </div>
          </div>
          <div className="email-gate">
            <div className="email-gate-card">
              <div className="email-gate-title">Verify Your Email</div>
              <p className="email-gate-desc">
                We'll send a 6-digit code to confirm this email is yours, track your application
                status, and prevent duplicate submissions. It's never shared publicly.
              </p>
              <div className="field" style={{ width: '100%' }}>
                <label className="flabel">
                  Email Address <span className="qreq">*</span>
                </label>
                <input
                  className={`finput${emailError ? ' err' : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  onKeyDown={e => e.key === 'Enter' && !sendingCode && sendCode()}
                  autoFocus
                />
                {emailError && <div className="field-error">⚠ {emailError}</div>}
              </div>
              <button
                className="btn-submit"
                onClick={sendCode}
                disabled={sendingCode}
                style={{ marginTop: 8 }}
              >
                {sendingCode
                  ? <><span className="spinner-sm" /> Sending code…</>
                  : 'Send Verification Code →'}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Step 2: Code entry ────────────────────────────────────────────────────────
  if (step === 'code') {
    return (
      <>
        <FormStyles accentColor={accentColor} />
        <NavBar />
        <div className="form-page">
          <Toast toast={toast} />
          <div className="form-hero">
            <span className="form-icon">{icon}</span>
            <div>
              <div className="form-eyebrow">
                {type === 'FRANCHISE' ? 'Franchise Owner Application' : 'Staff Application'}
              </div>
              <h1 className="form-title">{title}</h1>
            </div>
          </div>
          <div className="email-gate">
            <div className="email-gate-card">
              <div className="email-gate-title">Enter Your Code</div>
              <p className="email-gate-desc">
                We sent a 6-digit code to{' '}
                <strong style={{ color: '#fff' }}>{email.trim()}</strong>.
                Enter it below to continue. The code expires in 10 minutes.
              </p>
              <div className="field" style={{ width: '100%' }}>
                <label className="flabel">
                  Verification Code <span className="qreq">*</span>
                </label>
                <input
                  className={`finput${codeError ? ' err' : ''}`}
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setCodeError('') }}
                  onKeyDown={e => e.key === 'Enter' && !verifying && !checkingStatus && confirmCode()}
                  style={{ letterSpacing: '0.3em', fontSize: 18, textAlign: 'center' }}
                  autoFocus
                />
                {codeError && <div className="field-error">⚠ {codeError}</div>}
              </div>

              <button
                className="btn-submit"
                onClick={confirmCode}
                disabled={verifying || checkingStatus}
                style={{ marginTop: 8 }}
              >
                {verifying || checkingStatus
                  ? <><span className="spinner-sm" /> Verifying…</>
                  : 'Verify & Continue →'}
              </button>

              <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                {/* Resend — calls resendCode, NOT sendCode, to avoid step/rate-limit side-effects */}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resendCode}
                  disabled={sendingCode || resendCooldown > 0}
                  style={{ opacity: resendCooldown > 0 ? 0.55 : 1, cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer' }}
                >
                  {sendingCode
                    ? 'Sending…'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Code'}
                </button>

                {/* Go back — resets state without consuming a rate-limit slot */}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={goBackToEmail}
                >
                  Use Different Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Status wall (existing application, can't resubmit) ───────────────────────
  if (statusResult?.hasApplication && !statusResult.canResubmit) {
    const st   = statusResult.status!
    const info = STATUS_LABELS[st]
    return (
      <>
        <FormStyles accentColor={accentColor} />
        <NavBar />
        <div className="form-page">
          <div className="form-hero">
            <span className="form-icon">{icon}</span>
            <div>
              <div className="form-eyebrow">
                {type === 'FRANCHISE' ? 'Franchise Owner Application' : 'Staff Application'}
              </div>
              <h1 className="form-title">{title}</h1>
            </div>
          </div>
          <div className="email-gate">
            <div className="email-gate-card status-card">
              <div className="status-icon">{info.icon}</div>
              <div
                className="status-badge"
                style={{
                  background: `${info.color}18`,
                  border: `1px solid ${info.color}44`,
                  color: info.color,
                }}
              >
                {info.label}
              </div>
              <p className="email-gate-desc">{info.desc}</p>
              {statusResult.submittedAt && (
                <div className="status-meta">
                  Submitted{' '}
                  {new Date(statusResult.submittedAt).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <Link href="/" className="btn-back">← All Applications</Link>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setStep('email')
                    setStatusResult(null)
                    setEmail('')
                    setCode('')
                    setVerificationToken('')
                  }}
                >
                  Use Different Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Step 3: Full application form ─────────────────────────────────────────────
  return (
    <>
      <FormStyles accentColor={accentColor} />
      <NavBar />
      <div className="form-page">
        <Toast toast={toast} />

        {statusResult?.canResubmit && (
          <div className="resubmit-banner">
            Your previous application was{' '}
            <strong style={{ color: statusResult.status === 'ACCEPTED' ? 'var(--gr)' : 'var(--lose)' }}>
              {statusResult.status?.toLowerCase()}
            </strong>
            . You may submit a new application below.
          </div>
        )}

        <div className="form-hero">
          <span className="form-icon">{icon}</span>
          <div>
            <div className="form-eyebrow">
              {type === 'FRANCHISE' ? 'Franchise Owner Application' : 'Staff Application'}
            </div>
            <h1 className="form-title">{title}</h1>
            <p className="form-desc">{description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-wrap" noValidate>
          {/* Section 01 — Basic info */}
          <fieldset className="fset">
            <legend className="fset-legend">
              <span className="fset-num">01</span>
              Basic Information
            </legend>
            <div className="field-grid">
              <Field label="Full Name" error={errors.fullName} required>
                <input
                  className={`finput${errors.fullName ? ' err' : ''}`}
                  placeholder="Your full name"
                  value={core.fullName}
                  onChange={e => { setCore(p => ({ ...p, fullName: e.target.value })); setErrors(p => { const n = { ...p }; delete n.fullName; return n }) }}
                  maxLength={80}
                />
              </Field>

              <Field label="Email">
                <input
                  className="finput"
                  type="email"
                  value={email}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </Field>

              <Field label="Discord Username" error={errors.discordUsername} required hint="e.g. username or username#0">
                <input
                  className={`finput${errors.discordUsername ? ' err' : ''}`}
                  placeholder="username or username#0"
                  value={core.discordUsername}
                  onChange={e => { setCore(p => ({ ...p, discordUsername: e.target.value })); setErrors(p => { const n = { ...p }; delete n.discordUsername; return n }) }}
                  maxLength={40}
                />
              </Field>

              <Field label="Discord ID" error={errors.discordId} required hint="17–20 digit user ID">
                <input
                  className={`finput${errors.discordId ? ' err' : ''}`}
                  placeholder="123456789012345678"
                  value={core.discordId}
                  onChange={e => { setCore(p => ({ ...p, discordId: e.target.value })); setErrors(p => { const n = { ...p }; delete n.discordId; return n }) }}
                  maxLength={20}
                  inputMode="numeric"
                />
              </Field>

              <Field label="Age" error={errors.age} required>
                <input
                  className={`finput${errors.age ? ' err' : ''}`}
                  type="number"
                  placeholder="Your age"
                  value={core.age}
                  onChange={e => { setCore(p => ({ ...p, age: e.target.value })); setErrors(p => { const n = { ...p }; delete n.age; return n }) }}
                  min={10}
                  max={99}
                />
              </Field>

              <Field label="Timezone" error={errors.timezone} required>
                <select
                  className={`fselect${errors.timezone ? ' err' : ''}`}
                  value={core.timezone}
                  onChange={e => { setCore(p => ({ ...p, timezone: e.target.value })); setErrors(p => { const n = { ...p }; delete n.timezone; return n }) }}
                >
                  <option value="">Select your timezone…</option>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </Field>
            </div>
          </fieldset>

          {/* Section 02 — Department questions */}
          {questions.length > 0 && (
            <fieldset className="fset">
              <legend className="fset-legend">
                <span className="fset-num">02</span>
                Department Questions
              </legend>
              <div className="questions-list">
                {questions.map((q, i) => (
                  <QuestionField
                    key={q.id}
                    q={q}
                    index={i}
                    answer={answers[q.id]}
                    onChange={setAnswer}
                    error={errors[q.id]}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <div className="form-submit-area">
            <p className="form-disclaimer">
              By submitting this application, you confirm that all information provided is accurate.
              Falsifying information may result in disqualification.
            </p>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting
                ? <><span className="spinner-sm" /> Submitting…</>
                : 'Submit Application →'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Toast({ toast }: { toast: { msg: string; type: 'error' | 'success' } | null }) {
  if (!toast) return null
  return (
    <div className={`toast-bar ${toast.type}`}>
      {toast.type === 'error' ? '⚠ ' : '✓ '}{toast.msg}
    </div>
  )
}

function QuestionField({ q, index, answer, onChange, error }: {
  q: Question
  index: number
  answer: string | string[] | undefined
  onChange: (id: string, val: string | string[]) => void
  error?: string
}) {
  const charCount = typeof answer === 'string' ? answer.length : 0

  return (
    <div className="qfield">
      <div className="qlabel">
        <span className="qnum">{String(index + 1).padStart(2, '0')}</span>
        {q.label}
        {q.required && <span className="qreq">*</span>}
      </div>

      {q.type === 'SHORT_TEXT' && (
        <input
          className={`finput${error ? ' err' : ''}`}
          placeholder={q.placeholder || 'Your answer…'}
          value={(answer as string) ?? ''}
          onChange={e => onChange(q.id, e.target.value)}
          maxLength={q.charLimit ?? 500}
        />
      )}

      {q.type === 'LONG_TEXT' && (
        <div className="textarea-wrap">
          <textarea
            className={`ftextarea${error ? ' err' : ''}`}
            placeholder={q.placeholder || 'Your answer…'}
            rows={4}
            value={(answer as string) ?? ''}
            onChange={e => onChange(q.id, e.target.value)}
            maxLength={q.charLimit ?? 2000}
          />
          {q.charLimit && (
            <div className={`char-count${charCount > q.charLimit * 0.9 ? ' warn' : ''}`}>
              {charCount}/{q.charLimit}
            </div>
          )}
        </div>
      )}

      {q.type === 'DROPDOWN' && (
        <select
          className={`fselect${error ? ' err' : ''}`}
          value={(answer as string) ?? ''}
          onChange={e => onChange(q.id, e.target.value)}
        >
          <option value="">Select an option…</option>
          {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}

      {q.type === 'MULTIPLE_CHOICE' && (
        <div className="radio-group">
          {q.options.map(opt => (
            <label key={opt} className="radio-label">
              <input
                type="radio"
                name={q.id}
                value={opt}
                checked={(answer as string) === opt}
                onChange={() => onChange(q.id, opt)}
                className="radio-input"
              />
              <span className="radio-custom" />{opt}
            </label>
          ))}
        </div>
      )}

      {q.type === 'CHECKBOX' && (
        <div className="checkbox-group">
          {q.options.map(opt => {
            const checked = Array.isArray(answer) && answer.includes(opt)
            return (
              <label key={opt} className="check-label">
                <input
                  type="checkbox"
                  value={opt}
                  checked={checked}
                  onChange={e => {
                    const prev = Array.isArray(answer) ? answer : []
                    onChange(q.id, e.target.checked ? [...prev, opt] : prev.filter(v => v !== opt))
                  }}
                  className="check-input"
                />
                <span className="check-custom">{checked && '✓'}</span>{opt}
              </label>
            )
          })}
        </div>
      )}

      {error && <div className="field-error">⚠ {error}</div>}
    </div>
  )
}

function Field({ label, children, error, required, hint }: {
  label: string
  children: React.ReactNode
  error?: string
  required?: boolean
  hint?: string
}) {
  return (
    <div className="field">
      <label className="flabel">
        {label}
        {required && <span className="qreq">*</span>}
        {hint && <span className="fhint">{hint}</span>}
      </label>
      {children}
      {error && <div className="field-error">⚠ {error}</div>}
    </div>
  )
}

function NavBar() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', background: 'rgba(8,8,15,.95)', backdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255,255,255,.04)',
    }}>
      <Link href="/" style={{
        fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: '.08em',
        color: '#fff', textDecoration: 'none',
      }}>
        Revolutionary <span style={{ color: 'var(--red)' }}>Pro League</span>
      </Link>
      <Link href="/" style={{
        fontSize: 12, color: 'var(--mu)', textDecoration: 'none',
        padding: '7px 14px', background: 'var(--s2)', border: '1px solid var(--b)',
        borderRadius: 7, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        ← All Applications
      </Link>
    </nav>
  )
}

function FormStyles({ accentColor }: { accentColor: string }) {
  return (
    <style>{`
      .form-page { padding-top: 56px; min-height: 100vh; }

      .toast-bar {
        position: fixed; top: 68px; left: 50%; transform: translateX(-50%);
        background: var(--s3); border: 1px solid var(--b); border-radius: 9px;
        padding: 11px 18px; font-size: 13px; color: #fff; z-index: 999;
        box-shadow: 0 10px 36px rgba(0,0,0,.6); white-space: nowrap;
        border-left: 3px solid var(--red); animation: fadeUp .2s ease;
      }
      .toast-bar.success { border-left-color: var(--gr); }

      .resubmit-banner {
        background: rgba(24,212,100,.07); border-bottom: 1px solid rgba(24,212,100,.15);
        padding: 12px 28px; font-size: 13px; color: var(--tx2);
      }

      .form-hero {
        padding: 40px 28px 32px; display: flex; align-items: flex-start; gap: 20px;
        border-bottom: 1px solid var(--b2); position: relative;
      }
      .form-hero::after {
        content: ''; position: absolute; bottom: 0; left: 0; width: 160px; height: 2px;
        background: linear-gradient(90deg, ${accentColor}, transparent);
      }
      .form-icon {
        font-size: 40px; flex-shrink: 0; width: 64px; height: 64px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        background: rgba(232,0,29,.08); border: 1px solid rgba(232,0,29,.18);
      }
      .form-eyebrow {
        font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
        color: ${accentColor}; margin-bottom: 6px; font-family: 'JetBrains Mono', monospace;
      }
      .form-title {
        font-family: 'Bebas Neue', sans-serif; font-size: clamp(28px, 5vw, 44px);
        letter-spacing: .03em; color: #fff; line-height: 1; margin-bottom: 8px;
      }
      .form-desc { font-size: 13px; color: var(--mu); font-weight: 300; line-height: 1.65; max-width: 480px; }

      .email-gate { display: flex; align-items: flex-start; justify-content: center; padding: 60px 28px; }
      .email-gate-card {
        background: var(--s1); border: 1px solid var(--b); border-radius: 14px;
        padding: 32px 28px; width: 100%; max-width: 420px; display: flex; flex-direction: column;
        gap: 14px; position: relative; overflow: hidden;
      }
      .email-gate-card::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, ${accentColor}, transparent 60%);
      }
      .email-gate-title { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: .04em; color: #fff; }
      .email-gate-desc { font-size: 13px; color: var(--mu); line-height: 1.65; font-weight: 300; }

      .status-card { align-items: center; text-align: center; }
      .status-icon { font-size: 48px; }
      .status-badge {
        font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
        padding: 5px 14px; border-radius: 20px; font-family: 'JetBrains Mono', monospace;
      }
      .status-meta { font-size: 11px; color: var(--mu); font-family: 'JetBrains Mono', monospace; }

      .form-wrap {
        max-width: 740px; margin: 0 auto; padding: 32px 28px 80px;
        display: flex; flex-direction: column; gap: 28px;
      }
      .fset { border: 1px solid var(--b); border-radius: 12px; overflow: hidden; padding: 0; }
      .fset-legend {
        display: flex; align-items: center; gap: 10px; background: var(--s2);
        padding: 14px 20px; font-size: 12px; font-weight: 700; letter-spacing: .06em;
        text-transform: uppercase; color: var(--tx2); width: 100%; border-bottom: 1px solid var(--b);
      }
      .fset-num {
        font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${accentColor};
        background: rgba(232,0,29,.08); border: 1px solid rgba(232,0,29,.18);
        border-radius: 5px; padding: 2px 7px;
      }

      .field-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; padding: 20px; }
      .field { display: flex; flex-direction: column; gap: 6px; }
      .flabel { font-size: 12px; font-weight: 600; color: var(--tx2); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .fhint { font-size: 10px; color: var(--mu); font-weight: 400; font-family: 'JetBrains Mono', monospace; }
      .qreq { color: ${accentColor}; margin-left: 2px; }

      .finput, .fselect, .ftextarea {
        background: var(--s2); border: 1px solid var(--b); border-radius: 8px;
        color: var(--tx); font-size: 13px; font-family: 'Inter', sans-serif;
        padding: 10px 12px; outline: none; transition: border-color .15s; width: 100%;
      }
      .finput::placeholder, .ftextarea::placeholder { color: var(--mu); }
      .finput:focus, .fselect:focus, .ftextarea:focus { border-color: ${accentColor}; }
      .finput.err, .fselect.err, .ftextarea.err { border-color: var(--red); }
      .fselect {
        -webkit-appearance: none; appearance: none; cursor: pointer;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5'%3E%3Cpath fill='%2352526a' d='M0 0l4.5 5L9 0z'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 10px center; background-color: var(--s2);
      }
      .ftextarea { resize: vertical; min-height: 110px; line-height: 1.6; }
      .textarea-wrap { position: relative; }
      .char-count {
        position: absolute; bottom: 8px; right: 10px; font-size: 10px; color: var(--mu);
        font-family: 'JetBrains Mono', monospace; pointer-events: none;
      }
      .char-count.warn { color: var(--am); }
      .field-error { font-size: 11px; color: var(--red); display: flex; align-items: center; gap: 4px; }

      .questions-list { display: flex; flex-direction: column; gap: 20px; padding: 20px; }
      .qfield { display: flex; flex-direction: column; gap: 8px; }
      .qlabel {
        font-size: 13px; font-weight: 500; color: var(--tx);
        display: flex; align-items: flex-start; gap: 8px; line-height: 1.5;
      }
      .qnum {
        font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${accentColor};
        background: rgba(232,0,29,.08); border: 1px solid rgba(232,0,29,.16);
        border-radius: 4px; padding: 1px 5px; flex-shrink: 0; margin-top: 2px;
      }

      .radio-group, .checkbox-group { display: flex; flex-direction: column; gap: 8px; }
      .radio-label, .check-label {
        display: flex; align-items: center; gap: 10px; font-size: 13px;
        color: var(--tx2); cursor: pointer; padding: 9px 12px; border-radius: 8px;
        border: 1px solid var(--b); background: var(--s2); transition: all .13s;
      }
      .radio-label:hover, .check-label:hover { background: var(--s3); border-color: rgba(255,255,255,.1); }
      .radio-input, .check-input { display: none; }
      .radio-custom {
        width: 15px; height: 15px; border-radius: 50%; border: 2px solid var(--mu2);
        flex-shrink: 0; transition: all .13s;
      }
      .radio-input:checked + .radio-custom {
        border-color: ${accentColor}; background: ${accentColor}; box-shadow: inset 0 0 0 3px var(--s2);
      }
      .check-custom {
        width: 15px; height: 15px; border-radius: 4px; border: 2px solid var(--mu2);
        flex-shrink: 0; transition: all .13s; display: flex; align-items: center;
        justify-content: center; font-size: 9px; color: #fff; font-weight: 700;
      }
      .check-input:checked ~ .check-custom { border-color: ${accentColor}; background: ${accentColor}; }

      .form-submit-area { display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
      .form-disclaimer {
        font-size: 11px; color: var(--mu); text-align: right; max-width: 400px;
        line-height: 1.6; font-family: 'JetBrains Mono', monospace;
      }

      /* Primary CTA */
      .btn-submit {
        display: inline-flex; align-items: center; gap: 8px; background: ${accentColor};
        color: ${accentColor === 'var(--gold)' ? '#0a0a12' : '#fff'};
        font-size: 14px; font-weight: 700; letter-spacing: .03em;
        padding: 14px 32px; border-radius: 9px; border: none; cursor: pointer;
        transition: all .15s; min-width: 200px; justify-content: center;
      }
      .btn-submit:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(232,0,29,.4); opacity: .9; }
      .btn-submit:disabled { opacity: .6; cursor: not-allowed; }

      /* Secondary/ghost actions (resend, back) */
      .btn-secondary {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 12px; font-weight: 600; color: var(--tx2);
        background: var(--s3); border: 1px solid var(--b); border-radius: 8px;
        padding: 9px 16px; cursor: pointer; transition: all .15s;
      }
      .btn-secondary:hover:not(:disabled) { background: var(--s4, var(--s3)); border-color: rgba(255,255,255,.12); }
      .btn-secondary:disabled { opacity: .55; cursor: not-allowed; }

      .spinner-sm {
        width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3);
        border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite;
      }

      .success-wrap {
        max-width: 500px; margin: 100px auto 0; padding: 32px 28px;
        text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px;
      }
      .success-icon {
        width: 72px; height: 72px; border-radius: 50%;
        background: rgba(24,212,100,.1); border: 2px solid rgba(24,212,100,.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 32px; color: var(--gr); animation: fadeUp .5s ease;
      }
      .success-title { font-family: 'Bebas Neue', sans-serif; font-size: 42px; letter-spacing: .04em; color: #fff; }
      .success-sub { font-size: 14px; color: var(--mu); line-height: 1.7; font-weight: 300; }

      .btn-back {
        display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;
        font-size: 13px; font-weight: 600; color: #fff; background: var(--s2);
        border: 1px solid var(--b); border-radius: 8px; padding: 11px 22px;
        text-decoration: none; transition: all .15s;
      }
      .btn-back:hover { background: var(--s3); border-color: rgba(255,255,255,.12); }

      @keyframes spin  { to { transform: rotate(360deg) } }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }

      @media (max-width: 640px) {
        .form-hero { padding: 28px 20px 24px; flex-direction: column; gap: 12px; }
        .form-wrap { padding: 24px 16px 60px; }
        .field-grid { grid-template-columns: 1fr; gap: 14px; padding: 16px; }
        .questions-list { padding: 16px; }
        .form-submit-area { align-items: stretch; }
        .form-disclaimer { text-align: left; max-width: none; }
        .btn-submit { width: 100%; }
        .email-gate { padding: 40px 16px; }
      }
    `}</style>
  )
}
