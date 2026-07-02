import nodemailer from 'nodemailer'

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP is not configured.')
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

export async function sendVerificationEmail(to: string, code: string, contextLabel: string) {
  const { SMTP_FROM, SMTP_USER } = process.env
  const transporter = getTransporter()

  await transporter.sendMail({
    from: `"Revolutionary Pro League" <${SMTP_FROM || SMTP_USER}>`,
    to,
    subject: `Your verification code: ${code}`,
    text: `Your verification code for the ${contextLabel} application is: ${code}\n\nThis code expires in 10 minutes.`,
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

/**
 * Emails an applicant the outcome of their application (accepted or denied),
 * including the department/role they applied for and suggested next steps.
 */
export async function sendApplicationResultEmail(
  to: string,
  result: 'ACCEPTED' | 'DENIED',
  contextLabel: string
) {
  const { SMTP_FROM, SMTP_USER } = process.env
  const transporter = getTransporter()

  const isAccepted = result === 'ACCEPTED'
  const headline = isAccepted ? "You're in! 🎉" : 'Application Update'
  const color = isAccepted ? '#18d464' : '#e8001d'
  const summary = isAccepted
    ? `Congratulations — your application for <strong>${contextLabel}</strong> has been accepted!`
    : `Thank you for applying to <strong>${contextLabel}</strong>. After careful review, we will not be moving forward with your application at this time.`
  const nextSteps = isAccepted
    ? `Keep an eye on your Discord DMs and the RPL server for onboarding instructions and next steps from our team. If you don't hear from us within a few days, feel free to reach out in the RPL Discord.`
    : `This isn't necessarily the end of the road — many roles reopen in future seasons, and you're welcome to apply again then. Thanks for your interest in RPL.`

  await transporter.sendMail({
    from: `"Revolutionary Pro League" <${SMTP_FROM || SMTP_USER}>`,
    to,
    subject: isAccepted
      ? `You've been accepted — ${contextLabel}`
      : `Update on your ${contextLabel} application`,
    text: `${isAccepted ? 'Congratulations! ' : ''}Your application for ${contextLabel} has been ${isAccepted ? 'ACCEPTED' : 'DENIED'}.\n\n${nextSteps}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="margin: 0 0 8px; color: #111;">${headline}</h2>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">${summary}</p>
        <div style="font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${color}; background: ${color}18; border: 1px solid ${color}44; border-radius: 8px; padding: 10px 14px; text-align: center; margin: 20px 0;">
          ${isAccepted ? 'Accepted' : 'Denied'}
        </div>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">${nextSteps}</p>
        <p style="color: #888; font-size: 12px; line-height: 1.6; margin-top: 24px;">
          — Revolutionary Pro League
        </p>
      </div>
    `,
  })
}
