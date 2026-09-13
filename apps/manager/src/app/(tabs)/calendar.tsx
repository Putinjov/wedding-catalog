import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/auth/auth-context'
import { AppointmentCard } from '@/components/appointment-card'
import { DatePickerField } from '@/components/date-picker-field'
import { AppButton, LoadingBlock, ScreenHeader, StateMessage } from '@/components/ui'
import { getCalendar } from '@/lib/api'
import { addDays, formatDayHeading, formatDayShort, getDateKey } from '@/lib/dates'
import { colors, radius, spacing } from '@/theme'
import type { CalendarAppointment } from '@/types'

export default function CalendarScreen() {
  const { session } = useAuth()
  const router = useRouter()
  const [date, setDate] = useState(getDateKey())
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const week = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(date, index)),
    [date],
  )

  const load = useCallback(
    async (refresh = false) => {
      if (!session) return
      if (refresh) setRefreshing(true)
      else setLoading(true)
      setError('')
      try {
        setAppointments(await getCalendar(session.token, date, addDays(date, 1)))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Calendar could not be loaded.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [date, session],
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
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
          eyebrow="Europe / Dublin"
          subtitle="Tap a day to review its bookings."
          title="Calendar"
        />

        <View style={styles.navigation}>
          <Pressable
            accessibilityLabel="Previous week"
            onPress={() => setDate(addDays(date, -7))}
            style={styles.arrow}
          >
            <ChevronLeft color={colors.ink} size={20} />
          </Pressable>
          <AppButton compact label="Today" onPress={() => setDate(getDateKey())} variant="soft" />
          <Pressable
            accessibilityLabel="Next week"
            onPress={() => setDate(addDays(date, 7))}
            style={styles.arrow}
          >
            <ChevronRight color={colors.ink} size={20} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.week}>
            {week.map((day) => {
              const label = formatDayShort(day)
              const selected = day === date
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={day}
                  onPress={() => setDate(day)}
                  style={[styles.day, selected && styles.daySelected]}
                >
                  <Text style={[styles.dayLabel, selected && styles.dayTextSelected]}>
                    {label.day}
                  </Text>
                  <Text style={[styles.dayNumber, selected && styles.dayTextSelected]}>
                    {label.number}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>

        <DatePickerField label="Jump to date" onChange={setDate} value={date} />
        <Text style={styles.heading}>{formatDayHeading(date)}</Text>

        {loading ? <LoadingBlock label="Loading calendar…" /> : null}
        {!loading && error ? (
          <StateMessage
            action={<AppButton label="Try again" onPress={() => void load()} />}
            message={error}
            title="Couldn’t load calendar"
          />
        ) : null}
        {!loading && !error && appointments.length === 0 ? (
          <StateMessage message="There are no appointments on this date." title="No bookings" />
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

const styles = StyleSheet.create({
  arrow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 44,
  },
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: 40 },
  day: {
    alignItems: 'center',
    borderRadius: radius.md,
    gap: 4,
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dayLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  dayNumber: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  daySelected: { backgroundColor: colors.accent },
  dayTextSelected: { color: '#FFFFFF' },
  heading: { color: colors.ink, fontFamily: 'Georgia', fontSize: 22 },
  list: { gap: spacing.md },
  navigation: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  week: { flexDirection: 'row', gap: spacing.xs },
})
