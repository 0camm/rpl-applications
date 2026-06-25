# RPL Applications — Revolutionary Pro League

A full-stack application portal for RPL Season 11, built with Next.js 15, Prisma, and PostgreSQL.

## Features

- **Department applications** — Broadcast, Graphics, Justice, Mastersheet, Media, Referee
- **Franchise owner applications** — separate form and management
- **Admin dashboard** — stats, submissions management, status updates, CSV export
- **Department management** — open/close per department, edit questions, add/remove fields
- **Discord webhooks** — every submission sent as a rich embed
- **Rate limiting** — 3 submissions per IP per hour
- **Security** — CSRF via NextAuth, XSS prevention via input sanitization, server-side validation

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Prisma ORM** + **PostgreSQL**
- **NextAuth v5** (credentials provider, JWT sessions)
- **Zod** (validation)
- **bcryptjs** (password hashing)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Fill in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/rpl_applications"
AUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_PASSWORD="your-secure-password"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

### 3. Set up the database
```bash
npm run db:push    # Push schema to database
npm run db:seed    # Seed departments, questions, and admin user
```

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy to Vercel
```bash
vercel --prod
```
Set all environment variables in the Vercel dashboard. Use Vercel Postgres or Supabase for the database.

## Admin Access

Go to `/admin/login` and sign in with:
- **Username:** `admin`
- **Password:** whatever you set as `ADMIN_PASSWORD` in `.env` (default: `rpl-admin-2026`)

## Routes

| Path | Description |
|------|-------------|
| `/` | Homepage with department cards and franchise section |
| `/apply/[slug]` | Department application form (e.g. `/apply/broadcast`) |
| `/apply/franchise` | Franchise owner application form |
| `/admin` | Admin dashboard |
| `/admin/applications` | All submissions — view, filter, update status, export |
| `/admin/departments` | Manage departments, toggle open/closed, edit questions |
| `/admin/franchise` | Franchise application config |
| `/admin/login` | Admin sign in |

## Department Slugs

`broadcast`, `graphics`, `justice`, `mastersheet`, `media`, `referee`

## Database Schema

- `Admin` — admin users (hashed passwords)
- `Department` — 6 staff departments with settings
- `Question` — per-department or franchise questions
- `Application` — submissions with IP hash for rate limiting
- `Answer` — question responses linked to applications
- `FranchiseConfig` — singleton config for franchise applications
- `RateLimit` — IP-based rate limiting records
