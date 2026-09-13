import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/auth-context'
import { AppointmentCard } from '@/components/appointment-card'
import { DatePickerField } from '@/components/date-picker-field'
import { AppButton, Card, LoadingBlock, ScreenHeader, StateMessage } from '@/components/ui'
import { changeBookingClosures, getBookingSettings, getCalendar } from '@/lib/api'
import { addDays, formatDayHeading, getDateKey } from '@/lib/dates'
import { colors, radius, spacing } from '@/theme'
import type { BookingSettings, CalendarAppointment } from '@/types'

function shiftMonth(month: string, offset: number) {
  const value = new Date(`${month}-01T12:00:00Z`)
  value.setUTCMonth(value.getUTCMonth() + offset)
  return value.toISOString().slice(0, 7)
}
function closedLabel(day: string, settings: BookingSettings | null) {
  if (!settings) return ''
  if (
    settings.holidays?.some((entry) => entry.date === day) ||
    settings.closures?.some((entry) => entry.startDate <= day && day <= entry.endDate)
  )
    return 'Closed for this date'
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
  if (
    settings.closedWeekdays?.includes(String(weekday)) ||
    (weekday === 6 && settings.saturdayHours?.enabled === false)
  )
    return 'Closed by weekly schedule'
  return ''
}
export default function CalendarScreen() {
  const { session } = useAuth()
  const router = useRouter()
  const [date, setDate] = useState(getDateKey())
  const [month, setMonth] = useState(getDateKey().slice(0, 7))
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([])
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [start, setStart] = useState(date)
  const [end, setEnd] = useState(date)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const generation = useRef(0)
  const scroll = useRef<ScrollView>(null)
  const [dayTop, setDayTop] = useState(0)
  const canManage = session?.user.role === 'owner' || session?.user.role === 'manager'
  const first = `${month}-01`
  const gridStart = addDays(first, -((new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7))
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart],
  )
  const grouped = useMemo(() => {
    const result: Record<string, CalendarAppointment[]> = {}
    for (const appointment of appointments) {
      const day = getDateKey(new Date(appointment.startAt))
      ;(result[day] ??= []).push(appointment)
    }
    return result
  }, [appointments])
  const load = useCallback(
    async (refresh = false) => {
      if (!session) return
      const request = ++generation.current
      if (refresh) setRefreshing(true)
      else setLoading(true)
      setError('')
      try {
        const [items, schedule] = await Promise.all([
          getCalendar(session.token, gridStart, addDays(gridStart, 42)),
          getBookingSettings(session.token),
        ])
        if (request !== generation.current) return
        setAppointments(items)
        setSettings(schedule)
      } catch (err) {
        if (request === generation.current)
          setError(err instanceof Error ? err.message : 'Calendar could not be loaded.')
      } finally {
        if (request === generation.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [gridStart, session],
  )
  useFocusEffect(
    useCallback(() => {
      void load()
      return () => {
        generation.current++
      }
    }, [load]),
  )
  function navigateMonth(offset: number) {
    const next = shiftMonth(month, offset)
    setMonth(next)
    setDate(`${next}-01`)
    setEditing(false)
  }
  async function save(closed: boolean) {
    if (!session) return
    setSaving(true)
    setSaveError('')
    try {
      await changeBookingClosures(session.token, start, end, closed)
      setEditing(false)
      await load(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not update dates.')
    } finally {
      setSaving(false)
    }
  }
  function confirm(closed: boolean) {
    Alert.alert(
      closed ? 'Close booking dates?' : 'Reopen booking dates?',
      `${start} – ${end}\n${closed ? 'New bookings will be blocked. Existing appointments stay scheduled; contact affected clients separately.' : 'One-off closures will be removed. Weekly hours, blocked times and other booking rules still apply.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: closed ? 'Close dates' : 'Reopen dates', onPress: () => void save(closed) },
      ],
    )
  }
  const selectedAppointments = grouped[date] ?? []
  const monthTitle = new Intl.DateTimeFormat('en-IE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${first}T12:00:00Z`))
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl onRefresh={() => void load(true)} refreshing={refreshing} />
        }
      >
        <ScreenHeader
          eyebrow="Europe / Dublin"
          title="Calendar"
          subtitle="Select a date to see its appointments."
          action={
            <AppButton
              compact
              icon={<Plus color="#FFFFFF" size={18} />}
              label="Add"
              onPress={() => router.push('/appointment/new')}
              variant="primary"
            />
          }
        />
        <View style={styles.navigation}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => navigateMonth(-1)}
            style={styles.arrow}
          >
            <ChevronLeft color={colors.ink} size={20} />
          </Pressable>
          <Text style={styles.monthTitle}>{monthTitle}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => navigateMonth(1)}
            style={styles.arrow}
          >
            <ChevronRight color={colors.ink} size={20} />
          </Pressable>
        </View>
        <View>
          <View style={styles.grid}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <Text key={day} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {days.map((day) => {
              const selected = day === date
              const count = !loading && !error ? (grouped[day]?.length ?? 0) : 0
              const closed = !loading && !error ? closedLabel(day, settings) : ''
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDayHeading(day)}, ${count} appointments${closed ? `, ${closed}` : ''}`}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setDate(day)
                    setEditing(false)
                    scroll.current?.scrollTo({ y: dayTop, animated: true })
                  }}
                  style={[
                    styles.day,
                    day.slice(0, 7) !== month && styles.outside,
                    day === getDateKey() && styles.today,
                    selected && styles.selected,
                  ]}
                >
                  <Text style={[styles.dayNumber, selected && styles.inverse]}>
                    {Number(day.slice(-2))}
                  </Text>
                  <Text style={[styles.marker, selected && styles.inverse]}>
                    {count ? `● ${count}` : ' '}
                  </Text>
                  <Text style={[styles.closed, selected && styles.inverse]}>
                    {closed ? 'Closed' : ' '}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text style={styles.hint}>
            ● Appointment count · Closed dates may still have existing bookings.
          </Text>
        </View>
        <AppButton
          compact
          label="Today"
          onPress={() => {
            const today = getDateKey()
            setDate(today)
            setMonth(today.slice(0, 7))
            setEditing(false)
          }}
          variant="soft"
        />
        <View onLayout={(event) => setDayTop(event.nativeEvent.layout.y)} style={styles.list}>
          <Text style={styles.heading}>{formatDayHeading(date)}</Text>
          {!loading && !error && closedLabel(date, settings) ? (
            <Text style={styles.hint}>{closedLabel(date, settings)}</Text>
          ) : null}
          {canManage ? (
            <AppButton
              label={editing ? 'Hide date controls' : 'Manage booking dates'}
              disabled={loading || !!error || saving}
              onPress={() => {
                setStart(date)
                setEnd(date)
                setSaveError('')
                setEditing(!editing)
              }}
            />
          ) : null}
          {editing ? (
            <Card>
              <View style={styles.list}>
                <Text style={styles.heading}>Booking availability</Text>
                <DatePickerField
                  label="From (inclusive)"
                  value={start}
                  onChange={(value) => {
                    setStart(value)
                    if (value > end) setEnd(value)
                  }}
                />
                <DatePickerField label="To (inclusive)" value={end} onChange={setEnd} />
                <Text style={styles.hint}>
                  Existing appointments are kept. Reopening restores the normal weekly schedule; it
                  does not open regular days off or remove blocked times.
                </Text>
                {end < start ? (
                  <Text style={styles.hint}>End date must be on or after start date.</Text>
                ) : null}
                {saveError ? (
                  <Text accessibilityRole="alert" style={styles.hint}>
                    {saveError}
                  </Text>
                ) : null}
                <AppButton
                  label="Close dates"
                  variant="danger"
                  disabled={saving || end < start}
                  loading={saving}
                  onPress={() => confirm(true)}
                />
                <AppButton
                  label="Reopen dates"
                  disabled={saving || end < start}
                  onPress={() => confirm(false)}
                />
              </View>
            </Card>
          ) : null}
          {loading ? (
            <LoadingBlock label="Loading calendar…" />
          ) : error ? (
            <StateMessage
              title="Couldn’t load calendar"
              message={error}
              action={<AppButton label="Try again" onPress={() => void load()} />}
            />
          ) : (
            <>
              {!selectedAppointments.length ? (
                <StateMessage
                  message="There are no appointments on this date."
                  title="No bookings"
                />
              ) : null}
              {selectedAppointments.map((appointment) => (
                <AppointmentCard
                  key={String(appointment.id)}
                  appointment={appointment}
                  onPress={() =>
                    router.push({
                      pathname: '/appointment/[id]',
                      params: { id: String(appointment.id) },
                    })
                  }
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  safe: { backgroundColor: colors.canvas, flex: 1 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48 },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  monthTitle: { fontSize: 19, fontWeight: '700', color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.285714%',
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11,
    paddingVertical: 10,
  },
  day: {
    width: '14.285714%',
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.md,
  },
  today: { borderColor: colors.accent },
  selected: { backgroundColor: colors.accent },
  outside: { opacity: 0.5 },
  dayNumber: { fontSize: 16, fontWeight: '700', color: colors.ink },
  marker: { fontSize: 10, color: colors.accent, marginTop: 3 },
  closed: { fontSize: 8, color: colors.muted },
  inverse: { color: '#FFFFFF' },
  heading: { fontSize: 22, color: colors.ink },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  list: { gap: spacing.md },
})
