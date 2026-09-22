import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRestorePlan,
  generateDeploymentChecklist,
  getRecoveryStatus,
  verifyRecoveryPlan,
} from './deploy-readiness.js'

test('deployment and recovery readiness are available', () => {
  const checklist = generateDeploymentChecklist({
    frontendHost: 'render',
    backendHost: 'railway',
    environment: 'production',
  })

  assert.ok(checklist.length >= 5)
  assert.ok(checklist.some((item) => item.includes('database')))

  const recovery = getRecoveryStatus()
  assert.equal(typeof recovery.status, 'string')

  const restorePlan = createRestorePlan('production')
  assert.equal(restorePlan.environment, 'production')

  const verification = verifyRecoveryPlan(restorePlan)
  assert.equal(verification.valid, true)
})
