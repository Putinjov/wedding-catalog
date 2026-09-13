import * as Crypto from 'expo-crypto'

export function createOperationKey(): string {
  return Crypto.randomUUID()
}
