'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      username, password, redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid username or password')
    } else {
      router.push('/admin')
    }
  }

  return (
    <>
      <style>{`
        .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 20px; background: var(--bg); }
        .login-card { background: var(--s1); border: 1px solid var(--b); border-radius: 14px;
          width: 100%; max-width: 380px; overflow: hidden; position: relative; }
        .login-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--red), transparent 60%); }
        .login-header { padding: 28px 28px 24px; border-bottom: 1px solid var(--b2); }
        .login-brand { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: .08em; color: #fff; margin-bottom: 4px; }
        .login-brand em { color: var(--red); font-style: normal; }
        .login-sub { font-size: 11px; color: var(--mu); font-family: 'JetBrains Mono', monospace; letter-spacing: .08em; }
        .login-body { padding: 24px 28px 28px; display: flex; flex-direction: column; gap: 16px; }
        .login-field { display: flex; flex-direction: column; gap: 6px; }
        .login-label { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
          color: var(--tx2); font-family: 'JetBrains Mono', monospace; }
        .login-input { background: var(--s2); border: 1px solid var(--b); border-radius: 8px;
          color: var(--tx); font-size: 14px; font-family: 'Inter', sans-serif; padding: 11px 12px;
          outline: none; transition: border-color .15s; width: 100%; }
        .login-input:focus { border-color: var(--red-edge); }
        .login-input.err { border-color: var(--red); }
        .login-error { font-size: 12px; color: var(--red); padding: 10px 12px; background: rgba(232,0,29,.08);
          border: 1px solid rgba(232,0,29,.2); border-radius: 7px; }
        .login-btn { background: var(--red); color: #fff; font-size: 14px; font-weight: 700;
          padding: 13px; border-radius: 8px; border: none; cursor: pointer; width: 100%;
          transition: all .15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .login-btn:hover:not(:disabled) { background: #c8001a; box-shadow: 0 4px 20px rgba(232,0,29,.4); }
        .login-btn:disabled { opacity: .6; cursor: not-allowed; }
        .login-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
      `}</style>
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-brand">RPL <em>Admin</em></div>
            <div className="login-sub">SECURE ACCESS — SEASON 11</div>
          </div>
          <form className="login-body" onSubmit={handleSubmit}>
            {error && <div className="login-error">⚠ {error}</div>}
            <div className="login-field">
              <label className="login-label">Username</label>
              <input
                className={`login-input${error ? ' err' : ''}`}
                type="text" autoComplete="username"
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div className="login-field">
              <label className="login-label">Password</label>
              <input
                className={`login-input${error ? ' err' : ''}`}
                type="password" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <><span className="login-spinner" /> Signing in…</> : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
