import { AlertCircle, ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { formatTime } from '@/lib/dates'
import { purposeLabels } from '@/lib/labels'
import { cardShadow, colors, radius, spacing } from '@/theme'
import type { CalendarAppointment } from '@/types'

import { PaymentPill, StatusPill } from './status-pill'

export function AppointmentCard({
  appointment,
  onPress,
}: {
  appointment: CalendarAppointment
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityHint="Opens appointment details"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.time}>{formatTime(appointment.startAt)}</Text>
        <View style={styles.line} />
      </View>
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {appointment.customerName}
          </Text>
          <ChevronRight color={colors.muted} size={19} strokeWidth={1.8} />
        </View>
        <Text style={styles.meta}>
          {purposeLabels[appointment.purpose]}
          {appointment.dress?.name ? ` · ${appointment.dress.name}` : ''}
        </Text>
        {appointment.needsAdminReview ? (
          <View style={styles.review}>
            <AlertCircle color={colors.danger} size={15} />
            <Text style={styles.reviewText}>Needs attention</Text>
          </View>
        ) : null}
        <View style={styles.pills}>
          <StatusPill status={appointment.status} />
          <PaymentPill status={appointment.paymentStatus} />
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    ...cardShadow,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  content: { flex: 1, gap: spacing.sm },
  line: { backgroundColor: colors.accentSoft, flex: 1, marginTop: spacing.sm, width: 2 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  name: { color: colors.ink, flex: 1, fontSize: 17, fontWeight: '700' },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  review: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  reviewText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  time: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  timeColumn: { alignItems: 'center', minWidth: 48 },
})
