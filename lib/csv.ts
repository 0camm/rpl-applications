export function toCSV(rows: Record<string, string | number | null | undefined>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  return [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n')
}

export function formatApplicationForCSV(app: {
  id: string
  type: string
  department?: { name: string } | null
  fullName: string
  discordUsername: string
  discordId: string
  age: string
  timezone: string
  status: string
  submittedAt: Date
  answers: { questionLabel: string; value: string }[]
}) {
  const base: Record<string, string> = {
    ID: app.id,
    Type: app.type,
    Department: app.department?.name ?? (app.type === 'FRANCHISE' ? 'Franchise Owner' : '—'),
    'Full Name': app.fullName,
    'Discord Username': app.discordUsername,
    'Discord ID': app.discordId,
    Age: app.age,
    Timezone: app.timezone,
    Status: app.status,
    'Submitted At': app.submittedAt.toISOString(),
  }
  for (const answer of app.answers) {
    base[answer.questionLabel] = answer.value
  }
  return base
}
