import { z } from 'zod'

import {
  normalizeHttpOrigin,
  normalizePublicAssetOrigin,
  productionSiteOrigin,
} from '@/config/site-url'

const optionalValue = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
)

const serverEnvironmentSchema = z.object({
  CRON_SECRET: optionalValue,
  DATABASE_URL: optionalValue,
  NEXT_PUBLIC_SERVER_URL: optionalValue,
  PAYLOAD_SECRET: optionalValue,
  PREVIEW_SECRET: optionalValue,
  R2_ACCESS_KEY_ID: optionalValue,
  R2_BUCKET: optionalValue,
  R2_ENDPOINT: optionalValue,
  R2_PUBLIC_URL: optionalValue,
  R2_SECRET_ACCESS_KEY: optionalValue,
  STRIPE_SECRET_KEY: optionalValue,
  STRIPE_WEBHOOK_SECRET: optionalValue,
})

const requiredProductionVariables = [
  'CRON_SECRET',
  'DATABASE_URL',
  'NEXT_PUBLIC_SERVER_URL',
  'PAYLOAD_SECRET',
  'PREVIEW_SECRET',
  'R2_ACCESS_KEY_ID',
  'R2_BUCKET',
  'R2_ENDPOINT',
  'R2_PUBLIC_URL',
  'R2_SECRET_ACCESS_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>

function validateMongoUrl(value: string | undefined): void {
  if (value && !/^mongodb(?:\+srv)?:\/\//i.test(value)) {
    throw new Error('[env] DATABASE_URL must be a MongoDB connection string.')
  }
}

function validateProductionSecrets(environment: ServerEnvironment): void {
  const missing = requiredProductionVariables.filter((name) => !environment[name])
  if (missing.length > 0) {
    throw new Error(`[env] Missing required production variables: ${missing.join(', ')}.`)
  }

  if (environment.PAYLOAD_SECRET && environment.PAYLOAD_SECRET.length < 32) {
    throw new Error('[env] PAYLOAD_SECRET must be at least 32 characters in production.')
  }

  if (environment.PREVIEW_SECRET && environment.PREVIEW_SECRET.length < 24) {
    throw new Error('[env] PREVIEW_SECRET must be at least 24 characters in production.')
  }

  if (environment.CRON_SECRET && environment.CRON_SECRET.length < 24) {
    throw new Error('[env] CRON_SECRET must be at least 24 characters in production.')
  }

  if (
    normalizeHttpOrigin(environment.NEXT_PUBLIC_SERVER_URL, 'NEXT_PUBLIC_SERVER_URL') !==
    productionSiteOrigin
  ) {
    throw new Error(`[env] NEXT_PUBLIC_SERVER_URL must be ${productionSiteOrigin} in production.`)
  }
}

export function getServerEnvironment(
  options: { source?: NodeJS.ProcessEnv; strict?: boolean } = {},
): ServerEnvironment {
  const source = options.source ?? process.env
  const parsed = serverEnvironmentSchema.safeParse(source)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ')
    throw new Error(`[env] Invalid server environment: ${details}`)
  }

  const environment = parsed.data
  validateMongoUrl(environment.DATABASE_URL)
  normalizeHttpOrigin(environment.NEXT_PUBLIC_SERVER_URL, 'NEXT_PUBLIC_SERVER_URL')
  normalizeHttpOrigin(environment.R2_ENDPOINT, 'R2_ENDPOINT')
  normalizePublicAssetOrigin(environment.R2_PUBLIC_URL, 'R2_PUBLIC_URL')

  const strict = options.strict ?? source.NODE_ENV === 'production'
  if (strict) validateProductionSecrets(environment)

  return environment
}

export function isR2Configured(environment: ServerEnvironment): boolean {
  return Boolean(
    environment.R2_ACCESS_KEY_ID &&
      environment.R2_BUCKET &&
      environment.R2_ENDPOINT &&
      environment.R2_PUBLIC_URL &&
      environment.R2_SECRET_ACCESS_KEY,
  )
}
