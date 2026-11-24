import payload, { type Where } from 'payload'

import { privacyRetention } from '@/config/privacy'
import { assessAppointmentRetention } from '@/lib/privacy/assessAppointmentRetention'

function monthsBefore(now: Date, months: number): string {
  const cutoff = new Date(now)
  cutoff.setUTCDate(1)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate()
  cutoff.setUTCDate(Math.min(now.getUTCDate(), lastDay))
  return cutoff.toISOString()
}

async function previewRetention() {
  const { default: config } = await import('@payload-config')
  await payload.init({ config, disableOnInit: true })
  try {
    const now = new Date()
    const unpaidCutoff = new Date(now.getTime() - privacyRetention.abandonedUnpaidDays * 86_400_000).toISOString()
    const cancelledCutoff = new Date(now.getTime() - privacyRetention.cancelledUnpaidDays * 86_400_000).toISOString()
    const screens: Record<string, Where> = {
      expiredUnpaid: {
        status: { equals: 'expired' },
        paymentStatus: { in: ['unpaid', 'failed'] },
        updatedAt: { less_than_equal: unpaidCutoff },
      },
      cancelledWithoutRecordedPayment: {
        paymentStatus: { in: ['unpaid', 'failed'] },
        paidAt: { exists: false },
        stripePaymentIntentId: { exists: false },
        stripeCheckoutSessionId: { exists: false },
        stripeRefundId: { exists: false },
        amountPaid: { exists: false },
        status: { equals: 'cancelled' },
        or: [
          { cancelledAt: { less_than_equal: cancelledCutoff } },
          { and: [{ cancelledAt: { exists: false } }, { updatedAt: { less_than_equal: cancelledCutoff } }] },
        ],
      },
      completed: {
        status: { equals: 'completed' },
        endAt: { less_than_equal: monthsBefore(now, privacyRetention.completedOperationalMonths) },
      },
    }
    const appointmentCounts: Record<string, number> = {}
    const eligibleCounts: Record<string, number> = {}
    for (const [name, where] of Object.entries(screens)) {
      const result = await payload.count({
        collection: 'appointments',
        where: { and: [where, { needsAdminReview: { not_equals: true } }] },
      })
      appointmentCounts[name] = result.totalDocs
      if (name === 'completed') continue
      let page = 1
      let eligible = 0
      while (true) {
        const batch = await payload.find({
          collection: 'appointments',
          depth: 0,
          limit: 100,
          page,
          sort: 'id',
          where: { and: [where, { needsAdminReview: { not_equals: true } }] },
        })
        eligible += batch.docs.filter((appointment) => assessAppointmentRetention({ appointment, now }).eligible).length
        if (!batch.hasNextPage) break
        page += 1
      }
      eligibleCounts[name] = eligible
    }
    const templateCounts: Record<string, number> = {}
    for (const collection of ['pages', 'posts', 'categories', 'search', 'forms', 'form-submissions', 'redirects'] as const) {
      templateCounts[collection] = (await payload.count({ collection })).totalDocs
    }
    console.info(JSON.stringify({ asOf: now.toISOString(), appointmentCounts, eligibleCounts, templateCounts }, null, 2))
  } finally {
    await payload.destroy()
  }
}

previewRetention().catch(() => {
  console.error('Retention preview failed. Check the database connection and read permissions.')
  process.exitCode = 1
})
