import { randomBytes } from 'node:crypto'

export function createPublicReference(): string {
  return `fit_${randomBytes(16).toString('hex')}`
}
