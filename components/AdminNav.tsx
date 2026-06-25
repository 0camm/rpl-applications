'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '▦' },
  { href: '/admin/applications', label: 'Applications', icon: '📋' },
  { href: '/admin/departments', label: 'Departments', icon: '⚙️' },
  { href: '/admin/franchise', label: 'Franchise Config', icon: '🏆' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <style>{`
        .admin-nav { position: fixed; left: 0; top: 0; bottom: 0; width: 220px; background: var(--s1);
          border-right: 1px solid var(--b); display: flex; flex-direction: column; z-index: 100; }
        .admin-nav-header { padding: 18px 16px; border-bottom: 1px solid var(--b2); }
        .admin-nav-brand { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: .08em; color: #fff; }
        .admin-nav-brand em { color: var(--red); font-style: normal; }
        .admin-nav-pill { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
          color: var(--mu); font-family: 'JetBrains Mono', monospace; margin-top: 3px; }
        .admin-nav-body { flex: 1; padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; }
        .admin-nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 10px; border-radius: 8px;
          font-size: 13px; font-weight: 500; color: var(--mu); text-decoration: none; transition: all .15s; }
        .admin-nav-link:hover { background: var(--s2); color: var(--tx); }
        .admin-nav-link.active { background: rgba(232,0,29,.1); color: #fff; border: 1px solid rgba(232,0,29,.2); }
        .admin-nav-link .nav-icon { font-size: 14px; width: 20px; text-align: center; }
        .admin-nav-footer { padding: 12px 8px; border-top: 1px solid var(--b2); }
        .admin-signout { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 10px;
          border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--mu); background: none;
          border: none; cursor: pointer; transition: all .15s; text-align: left; }
        .admin-signout:hover { background: rgba(232,0,29,.08); color: var(--red); }
        /* Mobile hamburger */
        .mobile-ham { display: none; position: fixed; top: 12px; left: 12px; z-index: 200;
          background: var(--s2); border: 1px solid var(--b); border-radius: 8px; width: 40px; height: 40px;
          align-items: center; justify-content: center; flex-direction: column; gap: 4px; cursor: pointer; }
        .mobile-ham span { width: 16px; height: 2px; background: var(--mu); border-radius: 2px; }
        .mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 90; }
        @media (max-width: 900px) {
          .admin-nav { transform: translateX(-100%); transition: transform .22s ease; z-index: 110; }
          .admin-nav.open { transform: none; }
          .mobile-ham { display: flex; }
          .mobile-overlay.open { display: block; }
        }
      `}</style>

      <button className="mobile-ham" onClick={() => setMenuOpen(true)} aria-label="Menu">
        <span /><span /><span />
      </button>
      <div className={`mobile-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />

      <nav className={`admin-nav${menuOpen ? ' open' : ''}`}>
        <div className="admin-nav-header">
          <div className="admin-nav-brand">RPL <em>Admin</em></div>
          <div className="admin-nav-pill">Control Panel</div>
        </div>
        <div className="admin-nav-body">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-link${pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href)) ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="admin-nav-footer">
          <button className="admin-signout" onClick={() => signOut({ callbackUrl: '/admin/login' })}>
            <span className="nav-icon">↩</span>Sign Out
          </button>
        </div>
      </nav>
    </>
  )
}
