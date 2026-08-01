export type MigrationGateEnvironment = {
  MIGRATION_GATE_REQUIRED?: string
  VERCEL_ENV?: string
}

export function isMigrationGateRequired(
  environment: MigrationGateEnvironment = process.env,
): boolean {
  const explicitRequirement = environment.MIGRATION_GATE_REQUIRED?.trim()

  if (
    explicitRequirement !== undefined &&
    explicitRequirement !== '' &&
    explicitRequirement !== 'true' &&
    explicitRequirement !== 'false'
  ) {
    throw new Error('[migration-gate] MIGRATION_GATE_REQUIRED must be true or false.')
  }

  return environment.VERCEL_ENV === 'production' || explicitRequirement === 'true'
}

export function findPendingMigrationNames(
  availableNames: string[],
  appliedNames: Array<string | null | undefined>,
): string[] {
  const uniqueAvailableNames = new Set(availableNames)
  if (uniqueAvailableNames.size !== availableNames.length) {
    throw new Error('[migration-gate] Duplicate migration filenames are not allowed.')
  }

  const applied = new Set(appliedNames.filter((name): name is string => Boolean(name)))
  return availableNames.filter((name) => !applied.has(name))
}
