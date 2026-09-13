import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Mail, MessageCircle, Phone, Save, Smartphone } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'

import { useAuth } from '@/auth/auth-context'
import { DatePickerField } from '@/components/date-picker-field'
import { PaymentPill, StatusPill } from '@/components/status-pill'
import {
  AppButton,
  Card,
  FormInput,
  LoadingBlock,
  SectionTitle,
  StateMessage,
} from '@/components/ui'
import {
  apiOrigin,
  getAppointment,
  getAvailableSlots,
  getBookingSettings,
  rescheduleAppointment,
  updateAppointmentNotes,
  updateAppointmentStatus,
} from '@/lib/api'
import { callCustomer, emailCustomer, textCustomer, whatsappCustomer } from '@/lib/contact'
import { addDays, formatDateTime, formatMoney, getDateKey } from '@/lib/dates'
import { purposeLabels } from '@/lib/labels'
import { createOperationKey } from '@/lib/operation-key'
import { getStatusActions, type StatusAction } from '@/lib/status-actions'
import { colors, radius, serifFont, spacing } from '@/theme'
import type { AppointmentDetail, AvailableSlot, BookingSettings } from '@/types'

export default function AppointmentScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const { session, status } = useAuth()
  const [detail, setDetail] = useState<AppointmentDetail | null>(null)
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [internalNotes, setInternalNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(addDays(getDateKey(), 1))
  const [selectedTime, setSelectedTime] = useState('')
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [overrideNotice, setOverrideNotice] = useState(false)

  const load = useCallback(async () => {
    if (!session || !id) return
    setLoading(true)
    setError('')
    try {
      const [appointment, bookingSettings] = await Promise.all([
        getAppointment(session.token, id),
        getBookingSettings(session.token),
      ])
      setDetail(appointment)
      setInternalNotes(appointment.internalNotes ?? '')
      setSettings(bookingSettings)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Appointment could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [id, session])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  useEffect(() => {
    if (!session || !id || !rescheduleOpen) return
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setSlotsLoading(true)
      setSelectedTime('')
      setSlots([])
      setError('')
      try {
        const result = await getAvailableSlots(session.token, rescheduleDate, {
          allowNoticeOverride: overrideNotice,
          excludeId: id,
        })
        if (active) setSlots(result.slots)
      } catch (slotError) {
        if (active) {
          setSlots([])
          setError(slotError instanceof Error ? slotError.message : 'Slots could not be loaded.')
        }
      } finally {
        if (active) setSlotsLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [id, overrideNotice, rescheduleDate, rescheduleOpen, session])

  if (status !== 'authenticated') return <Redirect href="/" />

  async function performStatus(action: StatusAction) {
    if (!session || !id) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await updateAppointmentStatus(session.token, id, {
        acknowledgePaidCancellation: action.acknowledgePaidCancellation,
        acknowledgePaidReopen: action.acknowledgePaidReopen,
        allowUnpaidManualConfirmation: action.allowUnpaidManualConfirmation,
        status: action.status,
      })
      setDetail(updated)
      setNotice('Appointment status updated.')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Status could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  function runStatus(action: StatusAction) {
    if (!action.confirmMessage) {
      void performStatus(action)
      return
    }
    Alert.alert('Confirm action', action.confirmMessage, [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => void performStatus(action),
        style: action.destructive ? 'destructive' : 'default',
        text: 'Continue',
      },
    ])
  }

  async function saveNotes() {
    if (!session || !id) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await updateAppointmentNotes(
        session.token,
        id,
        internalNotes,
        createOperationKey(),
      )
      setDetail(updated)
      setInternalNotes(updated.internalNotes ?? '')
      setNotice('Internal notes saved.')
    } catch (notesError) {
      setError(notesError instanceof Error ? notesError.message : 'Notes could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  async function submitReschedule() {
    if (!session || !id || !selectedTime) return
    const submit = async () => {
      setBusy(true)
      setError('')
      setNotice('')
      try {
        const updated = await rescheduleAppointment(session.token, id, {
          allowNoticeOverride: overrideNotice,
          date: rescheduleDate,
          operationKey: createOperationKey(),
          time: selectedTime,
        })
        setDetail(updated)
        setRescheduleOpen(false)
        setNotice('Appointment rescheduled. The customer email has been queued.')
      } catch (rescheduleError) {
        setError(
          rescheduleError instanceof Error
            ? rescheduleError.message
            : 'Appointment could not be rescheduled.',
        )
      } finally {
        setBusy(false)
      }
    }

    if (overrideNotice) {
      Alert.alert(
        'Override notice rules?',
        'This bypasses minimum notice and the next-day cutoff. Closed dates and conflicts still apply.',
        [
          { style: 'cancel', text: 'Cancel' },
          { onPress: () => void submit(), text: 'Reschedule' },
        ],
      )
      return
    }
    await submit()
  }

  if (loading) return <LoadingBlock label="Loading appointment…" />
  if (!detail) {
    return (
      <StateMessage
        action={<AppButton label="Try again" onPress={() => void load()} />}
        message={error || 'This appointment is unavailable.'}
        title="Couldn’t open appointment"
      />
    )
  }

  const actions = getStatusActions(detail)
  const maxDate = addDays(getDateKey(), settings?.bookingWindowDays ?? 60)

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {detail.needsAdminReview ? (
        <Card style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Payment received — review required</Text>
          <Text style={styles.reviewBody}>
            {detail.reviewReason || 'Review the booking before contacting the customer.'}
          </Text>
          <AppButton
            compact
            label="Open full admin record"
            onPress={() =>
              void Linking.openURL(
                `${apiOrigin}/admin/collections/appointments/${encodeURIComponent(String(detail.id))}`,
              )
            }
          />
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <View style={styles.hero}>
        <Text style={styles.name}>{detail.customerName}</Text>
        <Text style={styles.date}>{formatDateTime(detail.startAt)}</Text>
        <View style={styles.pills}>
          <StatusPill status={detail.status} />
          <PaymentPill status={detail.paymentStatus} />
        </View>
      </View>

      <View style={styles.contactGrid}>
        <View style={styles.contactItem}>
          <AppButton
            compact
            icon={<Phone color={colors.ink} size={17} />}
            label="Call"
            onPress={() => void callCustomer(detail.phone)}
          />
        </View>
        <View style={styles.contactItem}>
          <AppButton
            compact
            icon={<Smartphone color={colors.ink} size={17} />}
            label="SMS"
            onPress={() => void textCustomer(detail.phone)}
          />
        </View>
        <View style={styles.contactItem}>
          <AppButton
            compact
            icon={<MessageCircle color={colors.ink} size={17} />}
            label="WhatsApp"
            onPress={() => void whatsappCustomer(detail.phone)}
          />
        </View>
        <View style={styles.contactItem}>
          <AppButton
            compact
            icon={<Mail color={colors.ink} size={17} />}
            label="Email"
            onPress={() => void emailCustomer(detail.email)}
          />
        </View>
      </View>

      <SectionTitle>Booking</SectionTitle>
      <Card>
        <DetailRow label="Purpose" value={purposeLabels[detail.purpose]} />
        <DetailRow label="Dress" value={detail.dress?.name ?? 'Not selected'} />
        <DetailRow label="Phone" value={detail.phone} />
        <DetailRow label="Email" value={detail.email} />
        <DetailRow label="Fitting fee" value={formatMoney(detail.fittingFee, detail.currency)} />
        <DetailRow
          label="Paid"
          value={formatMoney((detail.amountPaid ?? 0) / 100, detail.currency)}
        />
        <DetailRow label="Reference" value={detail.publicReference} />
        <DetailRow label="Source" value={detail.source === 'website' ? 'Website' : 'Manual'} />
      </Card>

      {detail.notes ? (
        <Card>
          <Text style={styles.cardLabel}>Customer notes</Text>
          <Text style={styles.body}>{detail.notes}</Text>
        </Card>
      ) : null}

      {detail.capabilities.canEditInternalNotes ? (
        <View style={styles.section}>
          <SectionTitle>Internal notes</SectionTitle>
          <FormInput
            helper="Visible to staff only."
            label="Notes"
            maxLength={1000}
            multiline
            onChangeText={setInternalNotes}
            value={internalNotes}
          />
          <AppButton
            icon={<Save color="#FFFFFF" size={18} />}
            label="Save notes"
            loading={busy}
            onPress={() => void saveNotes()}
            variant="primary"
          />
        </View>
      ) : null}

      {detail.capabilities.canReschedule ? (
        <View style={styles.section}>
          <SectionTitle>Reschedule</SectionTitle>
          {!rescheduleOpen ? (
            <AppButton label="Choose a new time" onPress={() => setRescheduleOpen(true)} />
          ) : (
            <Card style={styles.rescheduleCard}>
              <DatePickerField
                label="New date"
                maxDate={maxDate}
                minDate={addDays(getDateKey(), 1)}
                onChange={setRescheduleDate}
                value={rescheduleDate}
              />
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.cardLabel}>Override notice rules</Text>
                  <Text style={styles.small}>For urgent staff-arranged bookings only.</Text>
                </View>
                <Switch
                  onValueChange={setOverrideNotice}
                  trackColor={{ false: colors.line, true: colors.accentSoft }}
                  value={overrideNotice}
                />
              </View>
              <Text style={styles.cardLabel}>Available times</Text>
              {slotsLoading ? <LoadingBlock label="Checking availability…" /> : null}
              {!slotsLoading && slots.length === 0 ? (
                <Text style={styles.small}>No available slots on this date.</Text>
              ) : null}
              <View style={styles.slotGrid}>
                {slots.map((slot) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedTime === slot.time }}
                    key={slot.time}
                    onPress={() => setSelectedTime(slot.time)}
                    style={[styles.slot, selectedTime === slot.time && styles.slotSelected]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        selectedTime === slot.time && styles.slotTextSelected,
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <AppButton
                disabled={!selectedTime}
                label="Confirm new time"
                loading={busy}
                onPress={() => void submitReschedule()}
                variant="primary"
              />
              <AppButton label="Close" onPress={() => setRescheduleOpen(false)} />
            </Card>
          )}
        </View>
      ) : null}

      {actions.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>Actions</SectionTitle>
          {actions.map((action) => (
            <AppButton
              key={action.status}
              label={action.label}
              loading={busy}
              onPress={() => runStatus(action)}
              variant={action.destructive ? 'danger' : 'secondary'}
            />
          ))}
        </View>
      ) : null}

      {detail.history.audits.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>Timeline</SectionTitle>
          <Card>
            {detail.history.audits.slice(0, 8).map((entry) => (
              <View key={entry.id} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineCopy}>
                  <Text style={styles.timelineAction}>{entry.action.replaceAll('_', ' ')}</Text>
                  <Text style={styles.small}>
                    {formatDateTime(entry.timestamp)} · {entry.actorLabel}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </ScrollView>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  cardLabel: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  contactItem: { width: '48%' },
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: 48 },
  date: { color: colors.muted, fontSize: 15 },
  detailLabel: { color: colors.muted, fontSize: 13 },
  detailRow: {
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 3,
    paddingVertical: 10,
  },
  detailValue: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  error: { backgroundColor: colors.dangerSoft, color: colors.danger, padding: spacing.md },
  hero: { gap: spacing.sm },
  name: { color: colors.ink, fontFamily: serifFont, fontSize: 31 },
  notice: { backgroundColor: colors.successSoft, color: colors.success, padding: spacing.md },
  pills: { flexDirection: 'row', gap: spacing.sm },
  rescheduleCard: { gap: spacing.lg },
  reviewBody: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  reviewCard: { backgroundColor: colors.dangerSoft, borderColor: '#EBC6C4', gap: spacing.md },
  reviewTitle: { color: colors.danger, fontSize: 16, fontWeight: '800' },
  section: { gap: spacing.md },
  slot: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 76,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  slotText: { color: colors.ink, fontWeight: '700' },
  slotTextSelected: { color: '#FFFFFF' },
  small: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  switchCopy: { flex: 1, gap: 3 },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  timelineAction: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  timelineCopy: { flex: 1, gap: 2 },
  timelineDot: { backgroundColor: colors.accent, borderRadius: 4, height: 8, marginTop: 5, width: 8 },
  timelineRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: 9 },
})
