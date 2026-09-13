import { useFocusEffect, useRouter } from 'expo-router'
import { Bell, Plus, RotateCw } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/auth/auth-context'
import { AppointmentCard } from '@/components/appointment-card'
import {
  AppButton,
  Card,
  LoadingBlock,
  ScreenHeader,
  SectionTitle,
  StateMessage,
} from '@/components/ui'
import { getCalendar } from '@/lib/api'
import { addDays, formatDayHeading, getDateKey } from '@/lib/dates'
import { usePush } from '@/push/push-context'
import { colors, spacing } from '@/theme'
import type { CalendarAppointment } from '@/types'

export default function TodayScreen() {
  const { session } = useAuth()
  const push = usePush()
  const router = useRouter()
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const today = getDateKey()

  const load = useCallback(
    async (refresh = false) => {
      if (!session) return
      if (refresh) setRefreshing(true)
      else setLoading(true)
      setError('')
      try {
        setAppointments(await getCalendar(session.token, today, addDays(today, 1)))
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'Appointments could not be loaded.',
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [session, today],
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const summary = useMemo(
    () => ({
      confirmed: appointments.filter((item) => item.status === 'confirmed').length,
      review: appointments.filter((item) => item.needsAdminReview).length,
      total: appointments.length,
    }),
    [appointments],
  )

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />
        }
      >
        <ScreenHeader
          action={
            <AppButton
              compact
              icon={<Plus color="#FFFFFF" size={18} />}
              label="Add"
              onPress={() => router.push('/appointment/new')}
              variant="primary"
            />
          }
          eyebrow={`Hello, ${session?.user.name?.split(' ')[0] ?? 'team'}`}
          subtitle={formatDayHeading(today)}
          title="Today"
        />

        {push.state === 'disabled' || push.state === 'error' ? (
          <Card style={styles.notificationCard}>
            <View style={styles.notificationCopy}>
              <Bell color={colors.accent} size={22} />
              <View style={styles.notificationText}>
                <Text style={styles.notificationTitle}>Never miss a new booking</Text>
                <Text style={styles.notificationBody}>
                  Enable privacy-safe appointment alerts on this phone.
                </Text>
              </View>
            </View>
            <AppButton
              compact
              label="Enable"
              onPress={() => void push.enable()}
              variant="soft"
            />
          </Card>
        ) : null}

        <View style={styles.summary}>
          <Summary label="Bookings" value={summary.total} />
          <Summary label="Confirmed" value={summary.confirmed} />
          <Summary danger={summary.review > 0} label="Review" value={summary.review} />
        </View>

        <View style={styles.sectionHeader}>
          <SectionTitle>Schedule</SectionTitle>
          {!loading ? (
            <AppButton
              compact
              icon={<RotateCw color={colors.ink} size={15} />}
              label="Refresh"
              onPress={() => void load(true)}
            />
          ) : null}
        </View>

        {loading ? <LoadingBlock label="Loading today’s appointments…" /> : null}
        {!loading && error ? (
          <StateMessage
            action={<AppButton label="Try again" onPress={() => void load()} />}
            message={error}
            title="Couldn’t load today"
          />
        ) : null}
        {!loading && !error && appointments.length === 0 ? (
          <StateMessage
            action={
              <AppButton
                label="Add appointment"
                onPress={() => router.push('/appointment/new')}
                variant="primary"
              />
            }
            message="No fittings are scheduled for today."
            title="A quiet day"
          />
        ) : null}
        <View style={styles.list}>
          {appointments.map((appointment) => (
            <AppointmentCard
              appointment={appointment}
              key={String(appointment.id)}
              onPress={() =>
                router.push({
                  pathname: '/appointment/[id]',
                  params: { id: String(appointment.id) },
                })
              }
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Summary({
  danger = false,
  label,
  value,
}: {
  danger?: boolean
  label: string
  value: number
}) {
  return (
    <View style={[styles.summaryItem, danger && styles.summaryDanger]}>
      <Text style={[styles.summaryValue, danger && styles.summaryDangerText]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: 40 },
  list: { gap: spacing.md },
  notificationBody: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  notificationCard: { gap: spacing.md },
  notificationCopy: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  notificationText: { flex: 1, gap: 3 },
  notificationTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summary: { flexDirection: 'row', gap: spacing.sm },
  summaryDanger: { backgroundColor: colors.dangerSoft },
  summaryDangerText: { color: colors.danger },
  summaryItem: { backgroundColor: colors.secondary, flex: 1, gap: 2, padding: spacing.md },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 23, fontWeight: '800' },
})
