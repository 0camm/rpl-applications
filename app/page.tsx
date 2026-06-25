import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getData() {
  const [departments, franchiseConfig] = await Promise.all([
    prisma.department.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.franchiseConfig.findUnique({ where: { id: 'singleton' } }),
  ])
  return { departments, franchiseConfig }
}

export default async function HomePage() {
  const { departments, franchiseConfig } = await getData()

  return (
    <>
      <style>{`
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          height: 56px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px;
          background: rgba(8,8,15,.92);
          backdrop-filter: blur(24px) saturate(160%);
          border-bottom: 1px solid rgba(255,255,255,.03);
        }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-brand { font-family: 'Bebas Neue', sans-serif; font-size: 17px; letter-spacing: .08em; color: #fff; }
        .nav-brand em { color: var(--red); font-style: normal; }
        .nav-pill { font-size: 10px; font-weight: 600; letter-spacing: .08em; color: var(--mu);
          text-transform: uppercase; background: var(--s2); border: 1px solid var(--b);
          border-radius: 20px; padding: 3px 9px; }
        .nav-right { display: flex; align-items: center; gap: 10px; }
        .nav-back { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500;
          color: var(--mu); text-decoration: none; padding: 7px 14px; border-radius: 7px;
          background: var(--s2); border: 1px solid var(--b); transition: all .15s; }
        .nav-back:hover { color: var(--tx); border-color: rgba(255,255,255,.12); }
        .nav-cta { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
          color: #fff; background: var(--red); border: none; border-radius: 7px; padding: 8px 16px;
          cursor: pointer; text-decoration: none; transition: all .15s; }
        .nav-cta:hover { background: #c8001a; box-shadow: 0 4px 20px rgba(232,0,29,.4); }

        .page { padding-top: 56px; }
        .hero { position: relative; padding: 80px 28px 72px; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: -100px; right: -100px; width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(232,0,29,.07) 0%, transparent 70%); pointer-events: none; }
        .hero-eyebrow { display: flex; align-items: center; gap: 9px; font-size: 10px; font-weight: 700;
          letter-spacing: .2em; text-transform: uppercase; color: var(--red); margin-bottom: 16px;
          font-family: 'JetBrains Mono', monospace; }
        .hero-eyebrow::before { content: ''; width: 20px; height: 2px; background: var(--red); border-radius: 2px; }
        .hero h1 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 8vw, 88px);
          line-height: .9; letter-spacing: .02em; color: #fff; margin-bottom: 16px; }
        .hero h1 em { color: var(--red); font-style: normal; }
        .hero-sub { font-size: 14px; line-height: 1.75; font-weight: 300; color: rgba(226,226,242,.6);
          max-width: 480px; margin-bottom: 8px; }

        .divider { height: 1px; background: var(--b2); margin: 0 28px; }

        .section { padding: 60px 28px; }
        .section-header { margin-bottom: 32px; }
        .section-eyebrow { display: flex; align-items: center; gap: 10px; font-size: 10px; font-weight: 700;
          letter-spacing: .16em; text-transform: uppercase; color: var(--red); margin-bottom: 10px;
          font-family: 'JetBrains Mono', monospace; }
        .section-eyebrow::before { content: ''; width: 20px; height: 2px; background: var(--red); border-radius: 2px; }
        .section-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(30px, 5vw, 48px);
          letter-spacing: .03em; line-height: .95; color: #fff; }

        .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .dept-card { position: relative; background: var(--s1); border: 1px solid var(--b);
          border-radius: 12px; overflow: hidden; transition: border-color .2s, transform .2s;
          text-decoration: none; display: flex; flex-direction: column; }
        .dept-card:hover { border-color: rgba(255,255,255,.12); transform: translateY(-2px); }
        .dept-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--red), transparent); opacity: 0; transition: opacity .2s; }
        .dept-card:hover::before { opacity: 1; }
        .dept-card.closed { opacity: .7; }
        .dept-card.closed:hover { transform: none; }
        .dept-header { padding: 20px 20px 16px; display: flex; align-items: flex-start; gap: 14px; }
        .dept-icon { width: 44px; height: 44px; border-radius: 10px; background: var(--red-dim);
          display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;
          border: 1px solid var(--red-mid); }
        .dept-info { flex: 1; }
        .dept-status { display: flex; align-items: center; justify-content: flex-end; }
        .status-open { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700;
          letter-spacing: .1em; text-transform: uppercase; color: var(--gr); font-family: 'JetBrains Mono', monospace; }
        .status-open .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--gr);
          animation: livePulse 2s ease infinite; }
        .status-closed { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
          color: var(--mu); font-family: 'JetBrains Mono', monospace; }
        .dept-name { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: .04em; color: #fff; }
        .dept-desc { font-size: 12.5px; color: var(--mu); line-height: 1.65; font-weight: 300; }
        .dept-footer { padding: 16px 20px; border-top: 1px solid var(--b2); margin-top: auto; }
        .dept-btn { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%;
          padding: 11px; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: .02em;
          border: none; cursor: pointer; transition: all .15s; text-decoration: none; }
        .dept-btn-open { background: var(--red); color: #fff; }
        .dept-btn-open:hover { background: #c8001a; box-shadow: 0 4px 20px rgba(232,0,29,.35); }
        .dept-btn-closed { background: var(--s3); color: var(--mu); cursor: default; border: 1px solid var(--b); }

        .franchise-card { background: var(--s1); border: 1px solid var(--b); border-radius: 14px;
          overflow: hidden; position: relative; }
        .franchise-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--gold), transparent 60%); }
        .franchise-inner { display: flex; align-items: flex-start; gap: 24px; padding: 32px; flex-wrap: wrap; }
        .franchise-icon { width: 64px; height: 64px; border-radius: 12px; flex-shrink: 0; font-size: 32px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(201,168,76,.1); border: 1px solid rgba(201,168,76,.25); }
        .franchise-body { flex: 1; min-width: 260px; }
        .franchise-tag { font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
          color: var(--gold); margin-bottom: 8px; display: flex; align-items: center; gap: 7px;
          font-family: 'JetBrains Mono', monospace; }
        .franchise-tag::before { content: ''; width: 16px; height: 1px; background: var(--gold); }
        .franchise-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: .03em;
          color: #fff; margin-bottom: 10px; line-height: 1; }
        .franchise-desc { font-size: 13px; color: var(--mu); line-height: 1.7; font-weight: 300; max-width: 480px; }
        .franchise-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
          justify-content: center; }
        .btn-gold { display: inline-flex; align-items: center; gap: 7px; background: var(--gold);
          color: #0a0a12; font-weight: 700; font-size: 13px; letter-spacing: .03em; padding: 13px 28px;
          border-radius: 8px; text-decoration: none; border: none; cursor: pointer; transition: all .15s;
          white-space: nowrap; }
        .btn-gold:hover { background: #d4b257; box-shadow: 0 4px 20px rgba(201,168,76,.4); }
        .btn-gold-disabled { background: var(--s3); color: var(--mu); cursor: default; border: 1px solid var(--b); }
        .franchise-closed-msg { font-size: 11px; color: var(--mu); text-align: right; max-width: 220px;
          font-family: 'JetBrains Mono', monospace; }

        footer { padding: 32px 28px; border-top: 1px solid var(--b2); display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 14px; background: var(--s1); }
        .footer-brand { font-family: 'Bebas Neue', sans-serif; font-size: 13px; letter-spacing: .1em; color: var(--mu2); }
        .footer-copy { font-size: 11px; color: var(--mu2); font-family: 'JetBrains Mono', monospace; }
        .footer-links { display: flex; gap: 18px; }
        .footer-links a { font-size: 11px; color: var(--mu2); text-decoration: none; transition: color .15s; }
        .footer-links a:hover { color: var(--mu); }

        @media (max-width: 768px) {
          .hero { padding: 60px 20px 56px; }
          .section { padding: 48px 20px; }
          .franchise-inner { padding: 24px; gap: 16px; }
          .franchise-actions { width: 100%; align-items: flex-start; }
          .franchise-closed-msg { text-align: left; max-width: none; }
          footer { padding: 24px 20px; }
          .divider { margin: 0 20px; }
        }
        @media (max-width: 480px) {
          nav { padding: 0 16px; }
          .dept-grid { grid-template-columns: 1fr; }
          .section { padding: 36px 16px; }
          .hero { padding: 48px 16px 44px; }
          footer { padding: 20px 16px; }
          .divider { margin: 0 16px; }
        }
      `}</style>

      <nav>
        <a href="/" className="nav-logo">
          <span className="nav-brand">Revolutionary <em>Pro League</em></span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="nav-pill">Applications</span>
          <div className="nav-right">
            <a href="https://discord.com/invite/znF9Vnztff" target="_blank" rel="noopener" className="nav-cta">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.112 18.1.131 18.116a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Discord
            </a>
          </div>
        </div>
      </nav>

      <div className="page">
        <div className="hero">
          <div className="hero-eyebrow">Season 12 Applications</div>
          <h1>Join the<br /><em>Revolution</em></h1>
          <p className="hero-sub">Apply to become part of the staff team or own a franchise in the most competitive Roblox basketball league.</p>
        </div>

        <div className="divider" />

        <section className="section">
          <div className="section-header">
            <div className="section-eyebrow">Staff Positions</div>
            <h2 className="section-title">Department Applications</h2>
          </div>
          <div className="dept-grid">
            {departments.map((dept) => (
              <div key={dept.id} className={`dept-card${!dept.isOpen ? ' closed' : ''}`}>
                <div className="dept-header">
                  <div className="dept-icon">{dept.icon}</div>
                  <div className="dept-info">
                    <div className="dept-name">{dept.name}</div>
                    <p className="dept-desc">{dept.description}</p>
                  </div>
                </div>
                <div style={{ padding: '0 20px 4px', display: 'flex', justifyContent: 'flex-end' }}>
                  {dept.isOpen ? (
                    <span className="status-open"><span className="dot" />Open</span>
                  ) : (
                    <span className="status-closed">Closed</span>
                  )}
                </div>
                <div className="dept-footer">
                  {dept.isOpen ? (
                    <Link href={`/apply/${dept.slug}`} className="dept-btn dept-btn-open">
                      Apply Now →
                    </Link>
                  ) : (
                    <span className="dept-btn dept-btn-closed" title={dept.closedMessage}>
                      {dept.closedMessage.length > 40 ? dept.closedMessage.slice(0, 38) + '…' : dept.closedMessage}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="divider" />

        <section className="section">
          <div className="section-header">
            <div className="section-eyebrow">Ownership</div>
            <h2 className="section-title">Franchise Applications</h2>
          </div>
          <div className="franchise-card">
            <div className="franchise-inner">
              <div className="franchise-icon">🏆</div>
              <div className="franchise-body">
                <div className="franchise-tag">Season 12 Opportunity</div>
                <div className="franchise-title">Become a Franchise Owner</div>
                <p className="franchise-desc">
                  Own and manage one of 30 NBA franchises in the RPL. Build your roster, compete for the championship, and lead your team through a full season of elite Roblox basketball.
                </p>
              </div>
              <div className="franchise-actions">
                {franchiseConfig?.isOpen ? (
                  <Link href="/apply/franchise" className="btn-gold">
                    Apply for Ownership →
                  </Link>
                ) : (
                  <>
                    <span className="btn-gold btn-gold-disabled">Applications Closed</span>
                    <p className="franchise-closed-msg">{franchiseConfig?.closedMessage}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer>
        <div className="footer-brand">RPL — Revolutionary Pro League</div>
        <div className="footer-copy">© 2026 RPL League</div>
        <div className="footer-links">
          <a href="https://discord.com/invite/znF9Vnztff" target="_blank" rel="noopener">Discord</a>
          <a href="/admin/login">Admin</a>
        </div>
      </footer>
    </>
  )
}
