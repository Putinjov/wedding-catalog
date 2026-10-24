export function normalizeCustomerEmail(value: string): string {
  return value.trim().toLocaleLowerCase('en-IE')
}
