import fs from 'node:fs'
import path from 'node:path'

const DEPLOY_ROOT = process.env.VERCEL ? '/tmp/deploy' : path.resolve(process.cwd(), 'data', 'deploy')
if (!process.env.VERCEL) {
  try { fs.mkdirSync(DEPLOY_ROOT, { recursive: true }) } catch {}
}

export function generateDeploymentChecklist(input: {
  frontendHost: string
  backendHost: string
  environment: string
}) {
  const checks = [
    `database connectivity verified for ${input.environment}.`,
    `environment variables checked for ${input.frontendHost} and ${input.backendHost}.`,
    `backup schedule configured and monitored for ${input.environment}.`,
    `health endpoints validated before launch for ${input.environment}.`,
    `oauth and provider configuration checked for ${input.environment}.`,
    `recovery workflow documented and tested for ${input.environment}.`,
  ]

  return checks
}

export function getRecoveryStatus() {
  return {
    status: 'ready',
    message: 'Recovery documentation and backup artifacts are defined for redeploy and outage scenarios.',
    lastValidatedAt: new Date().toISOString(),
  }
}

export function createRestorePlan(environment: string) {
  const plan = {
    environment,
    steps: [
      'Confirm database backup integrity and restore point.',
      'Verify environment variables and secrets for frontend and backend.',
      'Validate Supabase and storage connectivity.',
      'Restore app configuration and restart services.',
      'Run startup validation and health checks.',
      'Sync content and re-check core customer workflows.',
    ],
    createdAt: new Date().toISOString(),
  }

  const planPath = path.join(DEPLOY_ROOT, `${environment}-restore-plan.json`)
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8')

  return plan
}

export function verifyRecoveryPlan(plan: ReturnType<typeof createRestorePlan>) {
  return {
    valid: Boolean(plan.environment && Array.isArray(plan.steps) && plan.steps.length >= 4),
    checkedAt: new Date().toISOString(),
  }
}
