import { Redirect, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'

import { useAuth } from '@/auth/auth-context'
import { DatePickerField } from '@/components/date-picker-field'
import { AppButton, Card, ChoiceChips, FormInput, LoadingBlock, SectionTitle } from '@/components/ui'
import {
  apiOrigin,
  createAppointment,
  type CreateAppointmentInput,
  getAvailableSlots,
  getBookingSettings,
} from '@/lib/api'
import { addDays, getDateKey } from '@/lib/dates'
import { colors, radius, spacing } from '@/theme'
import type { AvailableSlot, BookingPurpose, BookingSettings } from '@/types'

type PrivacyMethod = CreateAppointmentInput['privacyNoticeMethod']

export default function NewAppointmentScreen() {
  const { session, status } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [purpose, setPurpose] = useState<BookingPurpose>('undecided')
  const [privacyMethod, setPrivacyMethod] = useState<PrivacyMethod>('in_person')
  const [initialStatus, setInitialStatus] = useState<'confirmed' | 'pending_payment'>(
    'pending_payment',
  )
  const [date, setDate] = useState(addDays(getDateKey(), 1))
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [overrideNotice, setOverrideNotice] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [slotError, setSlotError] = useState('')

  useEffect(() => {
    if (!session) return
    void getBookingSettings(session.token)
      .then(setSettings)
      .catch((settingsError) =>
        setError(
          settingsError instanceof Error
            ? settingsError.message
            : 'Booking settings could not be loaded.',
        ),
      )
  }, [session])

  useEffect(() => {
    if (!session) return
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setLoadingSlots(true)
      setSlotError('')
      setTime('')
      setSlots([])
      try {
        const result = await getAvailableSlots(session.token, date, {
          allowNoticeOverride: overrideNotice,
        })
        if (active) setSlots(result.slots)
      } catch (loadError) {
        if (active) {
          setSlots([])
          setSlotError(
            loadError instanceof Error ? loadError.message : 'Available times could not be loaded.',
          )
        }
      } finally {
        if (active) setLoadingSlots(false)
      }
    })
    return () => {
      active = false
    }
  }, [date, overrideNotice, session])

  if (status !== 'authenticated') return <Redirect href="/" />

  async function submitConfirmed() {
    if (!session) return
    setBusy(true)
    setError('')
    try {
      const appointment = await createAppointment(session.token, {
        allowUnpaidManualConfirmation: initialStatus === 'confirmed',
        customerName,
        date,
        email,
        initialStatus,
        notes: notes.trim() || undefined,
        overrideNoticeRules: overrideNotice,
        phone,
        privacyNoticeMethod: privacyMethod,
        purpose,
        time,
      })
      router.replace({
        pathname: '/appointment/[id]',
        params: { id: String(appointment.id) },
      })
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Appointment could not be created.',
      )
    } finally {
      setBusy(false)
    }
  }

  function submit() {
    if (!customerName.trim() || !email.trim() || !phone.trim() || !time) {
      setError('Complete the customer details and choose an available time.')
      return
    }
    const warnings: string[] = []
    if (initialStatus === 'confirmed') {
      warnings.push('This confirms an unpaid manual booking without online fitting-fee payment.')
    }
    if (overrideNotice) {
      warnings.push('Minimum notice and the next-day cutoff will be bypassed.')
    }
    if (warnings.length === 0) {
      void submitConfirmed()
      return
    }
    Alert.alert('Confirm booking', warnings.join('\n\n'), [
      { style: 'cancel', text: 'Go back' },
      { onPress: () => void submitConfirmed(), text: 'Create booking' },
    ])
  }

  const minDate = addDays(getDateKey(), 1)
  const maxDate = addDays(getDateKey(), settings?.bookingWindowDays ?? 60)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.title}>Add a fitting</Text>
          <Text style={styles.subtitle}>
            Manual bookings use the same availability and conflict rules as the website.
          </Text>
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <SectionTitle>Customer</SectionTitle>
        <View style={styles.formSection}>
          <FormInput
            autoCapitalize="words"
            autoComplete="name"
            label="Full name"
            maxLength={120}
            onChangeText={setCustomerName}
            placeholder="Customer name"
            value={customerName}
          />
          <FormInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="customer@example.com"
            value={email}
          />
          <FormInput
            autoComplete="tel"
            keyboardType="phone-pad"
            label="Phone"
            maxLength={40}
            onChangeText={setPhone}
            placeholder="087 000 0000"
            value={phone}
          />
          <FormInput
            label="Customer notes (optional)"
            maxLength={1000}
            multiline
            onChangeText={setNotes}
            placeholder="Anything the customer wants us to know"
            value={notes}
          />
        </View>

        <SectionTitle>Purpose</SectionTitle>
        <ChoiceChips
          onChange={setPurpose}
          options={[
            { label: 'Undecided', value: 'undecided' },
            { label: 'Buy', value: 'buy' },
            { label: 'Rent', value: 'rent' },
          ]}
          value={purpose}
        />

        <SectionTitle>Date and time</SectionTitle>
        <View style={styles.formSection}>
          <DatePickerField
            label="Date"
            maxDate={maxDate}
            minDate={minDate}
            onChange={setDate}
            value={date}
          />
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.fieldLabel}>Override notice rules</Text>
              <Text style={styles.helper}>For urgent staff-arranged bookings only.</Text>
            </View>
            <Switch
              onValueChange={setOverrideNotice}
              trackColor={{ false: colors.line, true: colors.accentSoft }}
              value={overrideNotice}
            />
          </View>
          <Text style={styles.fieldLabel}>Available times</Text>
          {loadingSlots ? <LoadingBlock label="Checking availability…" /> : null}
          {slotError ? <Text style={styles.error}>{slotError}</Text> : null}
          {!loadingSlots && !slotError && slots.length === 0 ? (
            <Text style={styles.helper}>No available times on this date.</Text>
          ) : null}
          <View style={styles.slotGrid}>
            {slots.map((slot) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: time === slot.time }}
                key={slot.time}
                onPress={() => setTime(slot.time)}
                style={[styles.slot, time === slot.time && styles.slotSelected]}
              >
                <Text style={[styles.slotText, time === slot.time && styles.slotTextSelected]}>
                  {slot.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <SectionTitle>Privacy notice</SectionTitle>
        <Card style={styles.privacyCard}>
          <Text style={styles.helper}>
            Give the customer the current privacy notice before saving. Do not record consent on
            their behalf.
          </Text>
          <AppButton
            compact
            label="Open Privacy Policy"
            onPress={() => void Linking.openURL(`${apiOrigin}/privacy`)}
          />
          <ChoiceChips
            onChange={setPrivacyMethod}
            options={[
              { label: 'In person', value: 'in_person' },
              { label: 'Phone', value: 'phone' },
              { label: 'Email', value: 'email' },
              { label: 'SMS', value: 'sms' },
            ]}
            value={privacyMethod}
          />
        </Card>

        <SectionTitle>Initial status</SectionTitle>
        <ChoiceChips
          onChange={setInitialStatus}
          options={[
            { label: 'Pending payment', value: 'pending_payment' },
            { label: 'Confirmed (unpaid)', value: 'confirmed' },
          ]}
          value={initialStatus}
        />
        {initialStatus === 'confirmed' ? (
          <Text style={styles.warning}>
            This is an unpaid manual confirmation. Use it only when the fitting should proceed
            without Stripe payment.
          </Text>
        ) : null}

        <AppButton
          disabled={!time}
          label="Create appointment"
          loading={busy}
          onPress={submit}
          variant="primary"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: 48 },
  error: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    padding: spacing.md,
  },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  formSection: { gap: spacing.lg },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  intro: { gap: spacing.sm },
  privacyCard: { gap: spacing.lg },
  root: { backgroundColor: colors.canvas, flex: 1 },
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
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  switchCopy: { flex: 1, gap: 3 },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  title: { color: colors.ink, fontFamily: 'Georgia', fontSize: 30 },
  warning: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.md,
  },
})
