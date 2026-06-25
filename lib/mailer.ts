import nodemailer from 'nodemailer'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (transporter) return transporter

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in your .env file.'
    )
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465, // true for port 465, false for 587/25
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  return transporter
}

export async function sendVerificationEmail(to: string, code: string, contextLabel: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  const t = getTransporter()

  await t.sendMail({
    from: `"Revolutionary Pro League" <${from}>`,
    to,
    subject: `Your verification code: ${code}`,
    text: `Your verification code for the ${contextLabel} application is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="margin: 0 0 8px; color: #111;">Verify your email</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          Use this code to continue your <strong>${contextLabel}</strong> application:
        </p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; background: #f4f4f5; border-radius: 8px; padding: 16px 0; text-align: center; margin: 20px 0; color: #111;">
          ${code}
        </div>
        <p style="color: #888; font-size: 12px; line-height: 1.6;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}
