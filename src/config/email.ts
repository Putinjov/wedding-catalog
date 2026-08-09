import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter } from 'payload'

import { emailDeliveryDefaults } from '@/config/email-addresses'
import type { ServerEnvironment } from '@/config/env'

export { emailDeliveryDefaults }

const disabledEmailAdapter: EmailAdapter = () => ({
  defaultFromAddress: emailDeliveryDefaults.fromAddress,
  defaultFromName: emailDeliveryDefaults.fromName,
  name: 'privacy-safe-unconfigured',
  sendEmail: async () => {
    throw new Error('Email delivery is not configured.')
  },
})

export function getEmailAdapter(
  environment: ServerEnvironment,
): EmailAdapter | Promise<EmailAdapter> {
  if (!environment.SMTP_USER || !environment.SMTP_PASSWORD) {
    return disabledEmailAdapter
  }

  return nodemailerAdapter({
    defaultFromAddress: environment.EMAIL_FROM ?? emailDeliveryDefaults.fromAddress,
    defaultFromName: emailDeliveryDefaults.fromName,
    skipVerify: true,
    transportOptions: {
      auth: {
        pass: environment.SMTP_PASSWORD,
        user: environment.SMTP_USER,
      },
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
    },
  })
}

export function getEmailAddresses(environment: ServerEnvironment) {
  return {
    admin: environment.BOOKING_ADMIN_EMAIL ?? emailDeliveryDefaults.adminAddress,
    from: environment.EMAIL_FROM ?? emailDeliveryDefaults.fromAddress,
    replyTo: environment.EMAIL_REPLY_TO ?? emailDeliveryDefaults.replyToAddress,
  }
}
