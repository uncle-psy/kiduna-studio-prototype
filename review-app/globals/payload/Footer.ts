import type { GlobalConfig } from 'payload'

export const Footer: GlobalConfig = {
  slug: 'footer',
  fields: [
    {
      name: 'columns',
      type: 'array',
      maxRows: 4,
      fields: [
        { name: 'heading', type: 'text' },
        {
          name: 'links',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'url',   type: 'text', required: true },
          ],
        },
      ],
    },
    { name: 'copyright', type: 'text' },
    {
      name: 'socials',
      type: 'array',
      fields: [
        { name: 'platform', type: 'select', options: ['twitter','github','linkedin','instagram','youtube'] },
        { name: 'url',      type: 'text', required: true },
      ],
    },
  ],
}
