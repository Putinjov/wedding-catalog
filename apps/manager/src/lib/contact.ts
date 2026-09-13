import { Linking } from 'react-native'

function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('353')) return digits
  if (digits.startsWith('0')) return `353${digits.slice(1)}`
  return digits
}

export function callCustomer(phone: string): Promise<void> {
  return Linking.openURL(`tel:${phone}`)
}

export function textCustomer(phone: string): Promise<void> {
  return Linking.openURL(`sms:${phone}`)
}

export function emailCustomer(email: string): Promise<void> {
  return Linking.openURL(`mailto:${email}`)
}

export function whatsappCustomer(phone: string): Promise<void> {
  return Linking.openURL(`https://wa.me/${whatsappNumber(phone)}`)
}
