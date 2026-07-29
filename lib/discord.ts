interface ApplicationData {
  id: string
  type: string
  departmentName?: string
  robloxUsername: string
  discordUsername: string
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
    { name: 'Roblox Username', value: data.robloxUsername, inline: true },
    { name: 'Discord Username', value: data.discordUsername, inline: true },
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
