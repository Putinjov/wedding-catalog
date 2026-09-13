import { StyleSheet, Text, View } from 'react-native'

import { paymentLabels, statusLabels } from '@/lib/labels'
import { colors, radius } from '@/theme'
import type { AppointmentStatus, PaymentStatus } from '@/types'

type Tone = 'danger' | 'neutral' | 'success' | 'warning'

const statusTone: Record<AppointmentStatus, Tone> = {
  cancelled: 'danger',
  completed: 'success',
  confirmed: 'success',
  expired: 'neutral',
  no_show: 'danger',
  partially_refunded: 'neutral',
  payment_failed: 'danger',
  payment_processing: 'warning',
  payment_received_conflict: 'danger',
  pending_payment: 'warning',
  refunded: 'neutral',
}

const paymentTone: Record<PaymentStatus, Tone> = {
  failed: 'danger',
  paid: 'success',
  partially_refunded: 'neutral',
  processing: 'warning',
  refunded: 'neutral',
  unpaid: 'warning',
}

export function StatusPill({ status }: { status: AppointmentStatus }) {
  return <Pill label={statusLabels[status]} tone={statusTone[status]} />
}

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return <Pill label={paymentLabels[status]} tone={paymentTone[status]} />
}

function Pill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'danger' && styles.danger,
        tone === 'success' && styles.success,
        tone === 'warning' && styles.warning,
      ]}
    >
      <Text
        style={[
          styles.text,
          tone === 'danger' && styles.dangerText,
          tone === 'success' && styles.successText,
          tone === 'warning' && styles.warningText,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  danger: { backgroundColor: colors.dangerSoft },
  dangerText: { color: colors.danger },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  success: { backgroundColor: colors.successSoft },
  successText: { color: colors.success },
  text: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  warning: { backgroundColor: colors.warningSoft },
  warningText: { color: colors.warning },
})
