/**
 * Payload CMS admin users — separate from Kinship Studio users.
 * Only used to log into the Payload admin panel (/admin).
 * Regular Kinship Studio users authenticate via kinship-backend.
 */
import type { CollectionConfig } from 'payload'

export const CmsUsers: CollectionConfig = {
  slug: 'cms-users',
  auth: {
    useAPIKey: true,
  },
  admin: {
    useAsTitle: 'email',
    description: 'Payload admin panel users (not Studio users)',
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Super Admin',  value: 'super-admin'  },
        { label: 'Site Manager', value: 'site-manager' },
      ],
      defaultValue: ['site-manager'],
    },
  ],
}
