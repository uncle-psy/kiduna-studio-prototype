import type { GlobalConfig } from 'payload'

export const Settings: GlobalConfig = {
  slug: 'settings',
  admin: { description: 'Site-wide settings — name, fonts, colours, analytics' },
  fields: [
    // ─── Identity ─────────────────────────────────────────────────────
    { name: 'siteName',        type: 'text',     required: true,
      admin: { description: 'Displayed in the browser tab and site header' } },
    { name: 'siteDescription', type: 'textarea',
      admin: { description: 'Used as the default meta description' } },
    { name: 'logo',    type: 'upload', relationTo: 'media',
      admin: { description: 'Header logo image — recommended 200×60 px, transparent PNG' } },
    { name: 'favicon', type: 'upload', relationTo: 'media',
      admin: { description: 'Browser tab icon — 32×32 or 64×64 PNG/ICO' } },

    // ─── Typography ────────────────────────────────────────────────────
    {
      name: 'typography',
      type: 'group',
      admin: {
        description: 'Fonts loaded from Google Fonts. Pick any name from fonts.google.com (e.g. "Inter", "Playfair Display", "Lato").',
      },
      fields: [
        {
          name: 'bodyFont',
          type: 'text',
          defaultValue: 'Inter',
          admin: { description: 'Body / paragraph font — e.g. Inter, Lato, Open Sans' },
        },
        {
          name: 'headingFont',
          type: 'text',
          defaultValue: 'Inter',
          admin: { description: 'Headings font — e.g. Playfair Display, Raleway, Montserrat' },
        },
        {
          name: 'baseFontSize',
          type: 'select',
          defaultValue: '16',
          options: [
            { label: '14px (Compact)', value: '14' },
            { label: '16px (Default)', value: '16' },
            { label: '18px (Large)',   value: '18' },
          ],
        },
      ],
    },

    // ─── Brand Colours ────────────────────────────────────────────────
    {
      name: 'colors',
      type: 'group',
      admin: { description: 'Hex colours used across the site' },
      fields: [
        { name: 'primary',    type: 'text', defaultValue: '#111111',
          admin: { description: 'Primary / CTA colour — e.g. #6366f1' } },
        { name: 'background', type: 'text', defaultValue: '#ffffff',
          admin: { description: 'Page background colour' } },
        { name: 'text',       type: 'text', defaultValue: '#111111',
          admin: { description: 'Default body text colour' } },
      ],
    },

    // ─── Analytics ────────────────────────────────────────────────────
    {
      name: 'analytics',
      type: 'group',
      fields: [
        { name: 'googleAnalyticsId', type: 'text',
          admin: { description: 'GA4 Measurement ID — e.g. G-XXXXXXXXXX' } },
      ],
    },
  ],
}
