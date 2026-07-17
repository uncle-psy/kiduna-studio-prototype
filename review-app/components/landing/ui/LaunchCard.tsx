'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LaunchDef } from '@/lib/landing-data'
import type { LaunchpadCampaign } from '@/lib/launchpad-api-types'

const STATUS_CLASSES: Record<string, string> = {
  live: 'text-accent border-[rgba(234,170,0,0.5)] bg-[rgba(234,170,0,0.08)]',
  funded: 'text-[#4ade80] border-[rgba(74,222,128,0.4)]',
  refunding: 'text-dim border-border',
  fundraising: 'text-accent border-[rgba(234,170,0,0.5)] bg-[rgba(234,170,0,0.08)]',
  failed: 'text-dim border-border',
  closed: 'text-[#4ade80] border-[rgba(74,222,128,0.4)]',
  settling: 'text-[#4ade80] border-[rgba(74,222,128,0.4)]',
  initialized: 'text-accent border-[rgba(234,170,0,0.5)] bg-[rgba(234,170,0,0.08)]',
}

const PROGRESS_BAR: Record<string, string> = {
  live: 'bg-accent',
  funded: 'bg-[#4ade80]',
  refunding: 'bg-accent',
  fundraising: 'bg-accent',
  failed: 'bg-accent',
  closed: 'bg-[#4ade80]',
  settling: 'bg-[#4ade80]',
  initialized: 'bg-accent',
}

function mapApiStatusToDisplay(status: string): { label: string; key: string } {
  switch (status) {
    case 'fundraising':
    case 'initialized':
      return { label: 'Live', key: 'fundraising' }
    case 'live':
    case 'closed':
    case 'settling':
      return { label: 'Funded', key: 'live' }
    case 'refunding':
    case 'failed':
    case 'cancelled':
      return { label: 'Refunding', key: 'refunding' }
    default:
      return { label: status.charAt(0).toUpperCase() + status.slice(1), key: status }
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}k`
  return `$${amount}`
}

function formatTimeLeft(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return 'Ended'
  const days = Math.floor(seconds / 86400)
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`
  const hours = Math.floor(seconds / 3600)
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} left`
  const mins = Math.floor(seconds / 60)
  return `${mins} min${mins !== 1 ? 's' : ''} left`
}

/** Props: accepts either a static LaunchDef or an API LaunchpadCampaign */
export default function LaunchCard({
  launch,
  campaign,
}: {
  launch?: LaunchDef
  campaign?: LaunchpadCampaign
}) {
  const router = useRouter()

  // Render from static data (original behavior)
  if (launch) {
    const l = launch
    return (
      <article className="flex flex-col bg-surface border border-border rounded-[14px] p-[22px] transition-all duration-150 hover:border-border-strong hover:-translate-y-0.5">
        <div className="flex items-center justify-between gap-[10px] mb-3">
          <span
            className={`text-[0.62rem] tracking-[0.12em] uppercase font-bold py-[0.22rem] px-[0.6rem] rounded-full border ${STATUS_CLASSES[l.status] ?? ''}`}
          >
            {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
          </span>
          <span className="font-mono text-[0.78rem] text-dim">{l.fdv}</span>
        </div>
        <h3 className="font-display font-normal text-[1.3rem] text-white m-0 mb-[0.15rem] leading-[1.1] break-all overflow-hidden">
          {l.title}
        </h3>
        <div className="text-[0.76rem] text-dim mb-[0.7rem]">{l.meta}</div>
        <p className="text-muted text-[0.92rem] m-0 mb-4 flex-1">{l.description}</p>
        <div className="h-[7px] rounded-full bg-surface-elev overflow-hidden mb-2">
          <span
            className={`block h-full rounded-full ${PROGRESS_BAR[l.status] ?? 'bg-accent'}`}
            style={{ width: `${Math.min(l.progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between gap-2 text-[0.82rem] text-muted mb-[1.1rem]">
          <span>
            <b className="text-white font-bold">{l.committed}</b> committed
          </span>
          <span>{l.goal}</span>
        </div>
        {l.ctaStyle === 'gold' ? (
          <Link
            href={l.ctaHref}
            className="w-full text-center font-sans font-bold text-[0.95rem] px-6 py-3 rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150"
          >
            {l.cta}
          </Link>
        ) : (
          <Link
            href={l.ctaHref}
            className="w-full text-center font-sans font-bold text-[0.95rem] px-6 py-3 rounded-[4px] border border-border-strong text-white hover:border-white transition-all duration-150"
          >
            {l.cta}
          </Link>
        )}
      </article>
    )
  }

  // Render from API data
  if (!campaign) return null
  const c = campaign
  const displayStatus = mapApiStatusToDisplay(c.launchStatus)
  const statusKey = displayStatus.key
  const isLive = c.launchStatus === 'fundraising' || c.launchStatus === 'initialized'
  const isFunded = c.launchStatus === 'live' || c.launchStatus === 'closed' || c.launchStatus === 'settling'
  const isRefunding = c.launchStatus === 'refunding' || c.launchStatus === 'failed' || c.launchStatus === 'cancelled'

  const committed = formatCurrency(c.totalCommitted)
  const minRaise = c.minRaise || 0
  const goal = `${formatCurrency(minRaise)} goal · ${c.percentRaised}%`

  let meta = ''
  if (isLive) {
    meta = formatTimeLeft(c.timeRemainingSeconds)
  } else if (isFunded) {
    meta = c.percentRaised > 100 ? 'Overraised · Launched' : 'Funded · Launched'
  } else if (isRefunding) {
    meta = 'Goal not met · Backers refunded'
  }

  const fdv = minRaise > 0 ? `$${minRaise >= 1_000_000 ? (minRaise / 1_000_000).toFixed(1) + 'M' : Math.round(minRaise / 1_000) + 'K'} FDV` : ''

  let ctaLabel = 'Back this DUNA'
  let ctaStyle: 'gold' | 'ghost' = 'gold'
  if (isFunded) {
    ctaLabel = 'View DUNA'
    ctaStyle = 'ghost'
  } else if (isRefunding) {
    ctaLabel = 'Refunding backers'
    ctaStyle = 'ghost'
  }

  const handleClick = () => {
    router.push(`/launchpad/${c.slug}`)
  }

  return (
    <article
      onClick={handleClick}
      className="flex flex-col bg-surface border border-border rounded-[14px] p-[22px] transition-all duration-150 hover:border-border-strong hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-center justify-between gap-[10px] mb-3">
        <span
          className={`text-[0.62rem] tracking-[0.12em] uppercase font-bold py-[0.22rem] px-[0.6rem] rounded-full border ${STATUS_CLASSES[statusKey] ?? STATUS_CLASSES[c.launchStatus] ?? ''}`}
        >
          {displayStatus.label}
        </span>
        {fdv && <span className="font-mono text-[0.78rem] text-dim">{fdv}</span>}
      </div>
      <h3 className="font-display font-normal text-[1.3rem] text-white m-0 mb-[0.15rem] leading-[1.1] break-all overflow-hidden">
        {c.name}
      </h3>
      <div className="text-[0.76rem] text-dim mb-[0.7rem]">{meta}</div>
      
{c.description && (
  <p className="text-muted text-[0.92rem] m-0 mb-4 flex-1 overflow-hidden" style={{
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    wordBreak: 'break-all',
  }}>{c.description}</p>
)}
      <div className="h-[7px] rounded-full bg-surface-elev overflow-hidden mb-2">
        <span
          className={`block h-full rounded-full ${PROGRESS_BAR[statusKey] ?? PROGRESS_BAR[c.launchStatus] ?? 'bg-accent'}`}
          style={{ width: `${Math.min(c.percentRaised, 100)}%` }}
        />
      </div>
      <div className="flex justify-between gap-2 text-[0.82rem] text-muted mb-[1.1rem]">
        <span>
          <b className="text-white font-bold">{committed}</b> committed
        </span>
        <span>{goal}</span>
      </div>
      {ctaStyle === 'gold' ? (
        <span className="w-full text-center font-sans font-bold text-[0.95rem] px-6 py-3 rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150">
          {ctaLabel}
        </span>
      ) : (
        <span className="w-full text-center font-sans font-bold text-[0.95rem] px-6 py-3 rounded-[4px] border border-border-strong text-white hover:border-white transition-all duration-150">
          {ctaLabel}
        </span>
      )}
    </article>
  )
}