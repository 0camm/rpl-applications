import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RPL Applications — Revolutionary Pro League',
  description: 'Apply to join the Revolutionary Pro League as staff or a franchise owner for Season 11.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
