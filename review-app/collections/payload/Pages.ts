import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'status'] },
  versions: { drafts: { autosave: true } },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug',  type: 'text', required: true, admin: { position: 'sidebar' } },
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'type',     type: 'select', options: ['none','lowImpact','mediumImpact','highImpact'], defaultValue: 'lowImpact' },
        { name: 'richText', type: 'richText' },
        { name: 'media',    type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        {
          slug: 'content',
          fields: [{ name: 'richText', type: 'richText' }],
        },
        {
          slug: 'callToAction',
          fields: [
            { name: 'richText', type: 'richText' },
            {
              name: 'links',
              type: 'array',
              fields: [{
                name: 'link', type: 'group',
                fields: [
                  { name: 'label', type: 'text' },
                  { name: 'url',   type: 'text' },
                  { name: 'type',  type: 'select', options: ['primary','secondary'], defaultValue: 'primary' },
                ],
              }],
            },
          ],
        },
        {
          slug: 'mediaBlock',
          fields: [
            { name: 'media',   type: 'upload', relationTo: 'media', required: true },
            { name: 'caption', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'htmlContent',
      type: 'textarea',
      admin: {
        description: 'AI-generated HTML (with inline styles or Tailwind). When present, overrides the block layout above.',
        rows: 20,
      },
      hooks: {
        beforeChange: [
          ({ value }: { value?: string }) => {
            if (!value) return value
            return value
              .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
              .replace(/<style[\s\S]*?<\/style\s*>/gi, '')
              .replace(/<iframe[\s\S]*?(?:<\/iframe\s*>|\/>)/gi, '')
              .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
              .replace(/((?:href|src|action)\s*=\s*["']?)\s*javascript:/gi, '$1#')
              .replace(/((?:href|src)\s*=\s*["']?)\s*data:/gi, '$1#')
          },
        ],
      },
    },
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title',       type: 'text'     },
        { name: 'description', type: 'textarea' },
        { name: 'image',       type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
