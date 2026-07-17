import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'publishedAt'] },
  versions: { drafts: { autosave: true } },
  fields: [
    { name: 'title',    type: 'text',     required: true },
    { name: 'slug',     type: 'text',     admin: { position: 'sidebar' } },
    { name: 'content',  type: 'richText', required: true },
    { name: 'excerpt',  type: 'textarea' },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    { name: 'categories',   type: 'relationship', relationTo: 'categories', hasMany: true },
    { name: 'publishedAt',  type: 'date', admin: { position: 'sidebar' } },
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title',       type: 'text'     },
        { name: 'description', type: 'textarea' },
      ],
    },
  ],
}
