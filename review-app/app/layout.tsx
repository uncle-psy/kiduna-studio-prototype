import type { Metadata } from 'next'
import './globals.css'
import { StudioProvider } from '@/lib/studio-context'
import { AuthProvider } from '@/lib/auth-context'
import { QueryProvider } from '@/query/provider'

export const metadata: Metadata = {
  title: 'Kiduna Studio',
  description: 'Creator Studio for Kiduna Intelligence Platform',
}

const reviewFetchScript = `
(() => {
  const nativeFetch = window.fetch.bind(window);
  const market = { id: 'review-market', slug: 'wv-duna', name: 'WV DUNA', launchStatus: 'live', memberCount: 147, openProposalsCount: 3, sponsorWallet: 'ReviewWallet111111111111111111111111111111', tokenTicker: 'WVDUNA' };
  window.fetch = async (input, init) => {
    const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(value, window.location.origin);
    const isReviewApi = url.pathname.startsWith('/api/') || url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.startsWith('192.168.');
    if (!isReviewApi) return nativeFetch(input, init);
    const payload = url.pathname.includes('/markets')
      ? { ...market, item: market, market, data: { items: [market], markets: [market], total: 1 }, items: [market], markets: [market], total: 1, success: true }
      : { data: [], items: [], docs: [], agents: [], markets: [], contexts: [], total: 0, success: true };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
})();
`

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
        {process.env.NEXT_PUBLIC_REVIEW_MODE === 'true' && <script dangerouslySetInnerHTML={{ __html: reviewFetchScript }} />}
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
