import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ensureDefaultAdminRoles,
  getAdminRolePermissions,
  getSiteContentBlock,
  upsertSiteContentBlock,
} from './db.js'

test('admin roles and cms content persist correctly', () => {
  ensureDefaultAdminRoles()

  const rolePermissions = getAdminRolePermissions('content_manager')
  assert.ok(rolePermissions)
  assert.equal(rolePermissions.canEditContent, true)

  upsertSiteContentBlock('homepage_hero', {
    eyebrow: 'Mithila stories',
    headline: 'Held with museum care',
    ctaText: 'Explore the collection',
  })

  const block = getSiteContentBlock('homepage_hero')
  assert.equal(block?.headline, 'Held with museum care')
})
