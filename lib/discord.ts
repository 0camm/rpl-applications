interface ApplicationData {
  id: string
  type: string
  departmentName?: string
  fullName: string
  discordUsername: string
  discordId: string
  age: string
  timezone: string
  answers: { questionLabel: string; value: string }[]
  submittedAt: Date
}

const STATUS_COLORS = {
  PENDING: 0xf5a623,
  UNDER_REVIEW: 0x5b9cf6,
  ACCEPTED: 0x18d464,
  DENIED: 0xe8001d,
}

const DEPT_ICONS: Record<string, string> = {
  broadcast: '🎙️',
  graphics: '🎨',
  justice: '⚖️',
  mastersheet: '📊',
  media: '📸',
  referee: '🏀',
}

export async function sendApplicationToDiscord(data: ApplicationData) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return

  const icon = data.departmentName
    ? DEPT_ICONS[data.departmentName.toLowerCase().split(' ')[0]] ?? '📋'
    : '🏆'

  const fields = [
    { name: 'Full Name', value: data.fullName, inline: true },
    { name: 'Discord', value: `${data.discordUsername}`, inline: true },
    { name: 'Discord ID', value: data.discordId, inline: true },
    { name: 'Age', value: data.age, inline: true },
    { name: 'Timezone', value: data.timezone, inline: true },
    { name: 'Status', value: '🟡 Pending', inline: true },
    ...data.answers.slice(0, 12).map((a) => ({
      name: a.questionLabel.length > 50 ? a.questionLabel.slice(0, 47) + '...' : a.questionLabel,
      value: a.value.length > 1024 ? a.value.slice(0, 1020) + '...' : a.value || '—',
      inline: false,
    })),
  ]

  const title = data.type === 'FRANCHISE'
    ? '🏆 New Franchise Owner Application'
    : `${icon} New Application — ${data.departmentName ?? 'Unknown'}`

  const payload = {
    embeds: [
      {
        title,
        color: STATUS_COLORS.PENDING,
        fields,
        footer: {
          text: `Application ID: ${data.id} • RPL Season 11`,
        },
        timestamp: data.submittedAt.toISOString(),
      },
    ],
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Discord webhook failed:', err)
  }
}

export async function sendStatusUpdateToDiscord(
  applicationId: string,
  applicantName: string,
  department: string,
  oldStatus: string,
  newStatus: string
) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return

  const color = STATUS_COLORS[newStatus as keyof typeof STATUS_COLORS] ?? 0x52526a
  const emoji = { PENDING: '🟡', UNDER_REVIEW: '🔵', ACCEPTED: '✅', DENIED: '❌' }[newStatus] ?? '⚪'

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: `${emoji} Application Status Updated`,
          color,
          fields: [
            { name: 'Applicant', value: applicantName, inline: true },
            { name: 'Department', value: department, inline: true },
            { name: 'Status', value: `${oldStatus} → **${newStatus}**`, inline: false },
          ],
          footer: { text: `ID: ${applicationId}` },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  }).catch(console.error)
}
