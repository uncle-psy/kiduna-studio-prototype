'use client'

import MemberSettings from '@/components/settings/MemberSettings'

// Active layout settings — renders inside ActiveTopbar + ActiveSidebar.
// Shares the same UI as the Building settings (/settings) via MemberSettings.
export default function AccountPage() {
  return (
    <div style={{ padding: '32px', width: '100%' }}>
      <MemberSettings />
    </div>
  )
}