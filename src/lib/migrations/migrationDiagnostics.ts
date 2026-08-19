const mongodbProtocols = new Set(['mongodb:', 'mongodb+srv:'])
const safeGateMessagePattern = /^\[migration-gate\] [A-Za-z0-9 ().,:;_-]+$/
const safeErrorNamePattern = /^[A-Za-z][A-Za-z0-9]{0,63}$/
const maximumSignalDepth = 6
const maximumSignalNodes = 100

type ErrorSignals = {
  codes: Set<string>
  messages: string[]
  names: Set<string>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function collectErrorSignals(error: unknown): ErrorSignals {
  const signals: ErrorSignals = {
    codes: new Set(),
    messages: [],
    names: new Set(),
  }
  const visited = new Set<object>()
  let visitedNodes = 0

  function visit(value: unknown, depth: number): void {
    if (depth > maximumSignalDepth || visitedNodes >= maximumSignalNodes || !isObject(value)) {
      return
    }
    if (visited.has(value)) return
    visited.add(value)
    visitedNodes += 1

    if (value instanceof Map) {
      for (const entry of value.values()) visit(entry, depth + 1)
      return
    }
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth + 1)
      return
    }

    for (const [key, entry] of Object.entries(value)) {
      if ((key === 'code' || key === 'codeName') && ['number', 'string'].includes(typeof entry)) {
        signals.codes.add(String(entry).toLowerCase())
      } else if (key === 'message' && typeof entry === 'string') {
        signals.messages.push(entry.toLowerCase())
      } else if (key === 'name' && typeof entry === 'string') {
        signals.names.add(entry.toLowerCase())
      }

      visit(entry, depth + 1)
    }

    if (value instanceof Error) {
      signals.names.add(value.name.toLowerCase())
      signals.messages.push(value.message.toLowerCase())
      visit(value.cause, depth + 1)
    }
  }

  visit(error, 0)
  return signals
}

function containsSignal(values: Iterable<string>, pattern: RegExp): boolean {
  for (const value of values) {
    if (pattern.test(value)) return true
  }
  return false
}

function isSafeGateMessage(message: string): boolean {
  return (
    message.length <= 300 &&
    safeGateMessagePattern.test(message) &&
    !message.includes('://') &&
    !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/.test(message)
  )
}

function getSafeEnvironmentFailure(error: unknown): string | null {
  if (!(error instanceof Error) || !error.message.startsWith('[env] ')) return null

  const message = error.message

  if (message === '[env] DATABASE_URL must be a MongoDB connection string.') {
    return '[migration-gate] DATABASE_URL is not a valid MongoDB connection URI.'
  }
  if (message.startsWith('[env] Missing required production variables:')) {
    return '[migration-gate] Production environment is incomplete; verify required GitHub production secrets.'
  }
  if (message.startsWith('[env] Invalid server environment:')) {
    return '[migration-gate] Production environment contains an invalid value; verify GitHub production secrets.'
  }
  if (message === '[env] PAYLOAD_SECRET must be at least 32 characters in production.') {
    return '[migration-gate] PAYLOAD_SECRET is too short; update the GitHub production secret.'
  }
  if (message === '[env] PREVIEW_SECRET must be at least 24 characters in production.') {
    return '[migration-gate] PREVIEW_SECRET is too short; update the GitHub production secret.'
  }
  if (message === '[env] CRON_SECRET must be at least 24 characters in production.') {
    return '[migration-gate] CRON_SECRET is too short; update the GitHub production secret.'
  }
  if (message === '[env] SMTP_PASSWORD must be at least 16 characters in production.') {
    return '[migration-gate] SMTP_PASSWORD is too short; update the GitHub production secret.'
  }
  if (message.startsWith('[env] SMTP_USER must be ')) {
    return '[migration-gate] SMTP_USER does not match the expected Google Workspace account.'
  }
  if (message.startsWith('[env] EMAIL_FROM must be the verified Google Workspace alias ')) {
    return '[migration-gate] EMAIL_FROM does not match the expected verified Google Workspace alias.'
  }
  if (message.startsWith('[env] NEXT_PUBLIC_SERVER_URL must be ')) {
    return '[migration-gate] NEXT_PUBLIC_SERVER_URL does not match the production site origin.'
  }

  const urlVariable = message.match(
    /^\[env\] (NEXT_PUBLIC_SERVER_URL|R2_ENDPOINT|R2_PUBLIC_URL) must /,
  )?.[1]
  if (urlVariable) {
    return `[migration-gate] ${urlVariable} is invalid; verify the GitHub production secret.`
  }

  return '[migration-gate] Production environment validation failed; verify GitHub production secrets.'
}

export function assertMigrationDatabaseURL(value: string | undefined): void {
  if (!value) {
    throw new Error('[migration-gate] DATABASE_URL is missing.')
  }
  if (value !== value.trim() || /[\r\n]/.test(value)) {
    throw new Error('[migration-gate] DATABASE_URL contains unsupported whitespace.')
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('[migration-gate] DATABASE_URL is not a valid MongoDB connection URI.')
  }

  if (!mongodbProtocols.has(parsed.protocol) || !parsed.hostname) {
    throw new Error('[migration-gate] DATABASE_URL is not a valid MongoDB connection URI.')
  }
}

export function getSafeMigrationFailure(error: unknown): string {
  if (error instanceof Error && isSafeGateMessage(error.message)) {
    return error.message
  }

  const environmentFailure = getSafeEnvironmentFailure(error)
  if (environmentFailure) return environmentFailure

  const signals = collectErrorSignals(error)
  const combinedMessages = signals.messages.join('\n')

  if (
    signals.codes.has('18') ||
    signals.codes.has('8000') ||
    /(?:authentication failed|bad auth|auth failed)/i.test(combinedMessages)
  ) {
    return '[migration-gate] MongoDB authentication failed; verify the database user credentials.'
  }
  if (signals.codes.has('13') || /not authorized/i.test(combinedMessages)) {
    return '[migration-gate] MongoDB authorization failed; verify the database user role.'
  }
  if (
    containsSignal(signals.codes, /^(?:eai_again|enotfound|eservfail)$/i) ||
    /(?:querysrv|dns|enotfound|eai_again)/i.test(combinedMessages)
  ) {
    return '[migration-gate] MongoDB DNS resolution failed; verify the connection target.'
  }
  if (
    containsSignal(signals.names, /tls|ssl/i) ||
    containsSignal(signals.codes, /(?:cert|tls|ssl|verify.*signature|self_signed)/i) ||
    /(?:certificate|tls|ssl|handshake)/i.test(combinedMessages)
  ) {
    return '[migration-gate] MongoDB TLS negotiation failed; verify certificates and runtime trust.'
  }
  if (
    containsSignal(signals.names, /mongonetwork|networktimeout/i) ||
    containsSignal(signals.codes, /^(?:econnrefused|econnreset|etimedout)$/i)
  ) {
    return '[migration-gate] MongoDB network connection failed; verify Atlas Network Access.'
  }
  if (
    containsSignal(signals.names, /serverselection/i) ||
    containsSignal(signals.messages, /replicasetnoprimary|server selection/i)
  ) {
    return '[migration-gate] MongoDB server selection failed; verify Atlas Network Access and connection target.'
  }
  if (
    containsSignal(signals.names, /mongoparse|invalidargument/i) ||
    /(?:invalid connection string|invalid scheme)/i.test(combinedMessages)
  ) {
    return '[migration-gate] MongoDB connection URI parsing failed; verify URI encoding.'
  }
  if (
    signals.codes.has('20') ||
    signals.codes.has('251') ||
    /(?:transaction numbers are only allowed|transaction is not supported)/i.test(combinedMessages)
  ) {
    return '[migration-gate] MongoDB transaction support is unavailable for this deployment.'
  }

  const errorName =
    error instanceof Error && safeErrorNamePattern.test(error.name) ? error.name : 'UnknownError'
  return `[migration-gate] Production migration failed (${errorName}).`
}
