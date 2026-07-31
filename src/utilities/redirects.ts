const INTERNAL_REDIRECT_ORIGIN = 'https://internal.invalid'

export function normalizeInternalRedirectPath(value: string | null | undefined): string | null {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return null
  }

  try {
    const url = new URL(value, INTERNAL_REDIRECT_ORIGIN)

    if (url.origin !== INTERNAL_REDIRECT_ORIGIN) {
      return null
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function validateRedirectSource(value: string | null | undefined): true | string {
  const normalized = normalizeInternalRedirectPath(value)

  if (!normalized || normalized.includes('?') || normalized.includes('#')) {
    return 'Enter an internal pathname without a query string or fragment, for example /old-page.'
  }

  return true
}

export function validateRedirectTarget(value: string | null | undefined): true | string {
  return normalizeInternalRedirectPath(value)
    ? true
    : 'Enter a safe internal path beginning with a single slash.'
}
