import type { Metadata } from 'next'
import './globals.css'
import { StudioProvider } from '@/lib/studio-context'
import { AuthProvider } from '@/lib/auth-context'
import { QueryProvider } from '@/query/provider'

export const metadata: Metadata = {
  title: 'Kiduna Studio',
  description: 'Creator Studio for Kiduna Intelligence Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Fonts are self-hosted via @font-face in globals.css
            pointing to /fonts/goudy_heavyface_bt.ttf and /fonts/avenir-*.ttf */}
      </head>
      <body className="antialiased" style={{
        fontFamily: '"Avenir", "Avenir Next", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: '#03011B',
        color: '#ffffff',
      }}>
        <AuthProvider>
          <QueryProvider>
            <StudioProvider>{children}</StudioProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
