'use client'

import Link from 'next/link'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  action?: React.ReactNode
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-8">
      <div className="min-w-0">
        {breadcrumbs && (
          <div className="flex items-center gap-2 mb-2">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/30">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-muted text-sm hover:text-accent transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white/70 text-sm">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 style={{ fontFamily: '"Goudy Heavyface", "Goudy Old Style", Georgia, serif', fontWeight: 400, lineHeight: 1.05 }} className="text-white text-2xl sm:text-3xl">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}