import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DattaSeller — Visão geral',
  description: 'Operação comercial local do DattaSeller.',
  generator: 'DattaSeller',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f2ec',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body>
    </html>
  )
}
