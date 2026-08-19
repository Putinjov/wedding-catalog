const parseOriginHostname = (value: string): string => {
  const normalizedValue = value.trim().toLowerCase()

  if (!normalizedValue) {
    return ''
  }

  try {
    return new URL(
      normalizedValue.includes('://') ? normalizedValue : `http://${normalizedValue}`,
    ).hostname
  } catch {
    throw new Error(`ALLOWED_DEV_ORIGINS contains an invalid host: ${value}`)
  }
}

export const getAllowedDevOrigins = (
  source: NodeJS.ProcessEnv = process.env,
): string[] | undefined => {
  if (source.NODE_ENV !== 'development') {
    return undefined
  }

  const origins = Array.from(
    new Set(
      (source.ALLOWED_DEV_ORIGINS ?? '')
        .split(',')
        .map(parseOriginHostname)
        .filter(Boolean),
    ),
  )

  return origins.length > 0 ? origins : undefined
}
