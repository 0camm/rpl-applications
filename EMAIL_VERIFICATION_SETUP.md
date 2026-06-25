# Email verification — what changed and how to deploy it

## The bug you hit
Your patch script tried to create `app/api/applications/status/route.ts`, but the
`mkdir -p` line only created `app/api/applications/`, not the `status/` subfolder.
The `cat > .../status/route.ts << 'EOF'` line that followed silently failed
(no such directory), so that file never existed on disk. The "Continue" button
called a route that 404'd, and the error just got swallowed into a toast you
likely didn't notice.

## What's new
A real email-verification step now sits between "enter email" and "see your
status / fill out the form":

1. **Enter email** → POST `/api/applications/verify/request` → a random 6-digit
   code is stored in the new `VerificationCode` table and emailed via SMTP
   (10 minute expiry, 5 wrong attempts max).
2. **Enter code** → POST `/api/applications/verify/confirm` → if correct, the
   server issues a signed token (HMAC, using your `AUTH_SECRET`) proving this
   email was verified for this specific application context. No JWT library
   needed — just Node's built-in `crypto`.
3. That token is then required by **both**:
   - `/api/applications/status` (to check existing application status)
   - `/api/applications` (to actually submit) — so someone can't bypass the
     email gate by calling the submit API directly.

Token expires in 30 minutes — long enough to fill out the form after verifying.

## Files changed / added
- `prisma/schema.prisma` — added `VerificationCode` model, fixed `FranchiseConfig`
  default to `"singleton"` (cosmetic safety net; your seed already used that ID).
- `lib/mailer.ts` — new, sends the code via SMTP (nodemailer).
- `lib/verificationToken.ts` — new, signs/verifies the short-lived token.
- `app/api/applications/verify/request/route.ts` — new.
- `app/api/applications/verify/confirm/route.ts` — new.
- `app/api/applications/status/route.ts` — **created** (this was missing), now
  requires the verification token.
- `app/api/applications/route.ts` — now requires `verificationToken` in the
  submission payload.
- `components/ApplicationForm.tsx` — email step now sends a code instead of
  checking status directly; new code-entry step added; status check happens
  after code confirmation.
- `package.json` — added `nodemailer` + `@types/nodemailer`.
- `.env.example` — documents SMTP setup (see below).

## What you need to do

### 1. Get SMTP credentials (Resend, free)
1. Sign up at [resend.com](https://resend.com).
2. In the dashboard, go to **Settings → SMTP** and copy the credentials.
3. In your real `.env` (not `.env.example`):
   ```
   SMTP_HOST="smtp.resend.com"
   SMTP_PORT="587"
   SMTP_USER="resend"
   SMTP_PASS="<your Resend API key>"
   SMTP_FROM="onboarding@resend.dev"
   ```
   `onboarding@resend.dev` works immediately for testing. For production, add
   and verify your own domain in Resend, then change `SMTP_FROM` to something
   like `apply@yourdomain.com`.

### 2. Install the new dependency
```bash
cd ~/Downloads/rpl-applications
npm install
```

### 3. Push the schema change
```bash
npm run db:push
```
This adds the `VerificationCode` table. Existing data is untouched.

### 4. Test locally before deploying
```bash
npm run dev
```
Go through the flow on a department application:
- enter your own email
- check your inbox for the 6-digit code (check spam folder first time)
- enter the code
- confirm you land on either the form, or a status screen if you'd already applied

### 5. Commit and push
```bash
git add .
git commit -m "add email verification (6-digit code) and fix missing status route"
git push
```

## Note on the FranchiseConfig change
If your live database was seeded with the franchise config row using
`id: 'singleton'` (it was, per `prisma/seed.ts`), this schema change is a no-op
for existing data — it only changes the default for *brand new* databases that
haven't run the seed script. Nothing to migrate.
