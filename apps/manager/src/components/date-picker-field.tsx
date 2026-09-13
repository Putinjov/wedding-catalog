import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { CalendarDays } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { dateKeyToPickerDate, pickerDateToKey } from '@/lib/dates'
import { colors, radius, spacing } from '@/theme'

export function DatePickerField({
  label,
  maxDate,
  minDate,
  onChange,
  value,
}: {
  label: string
  maxDate?: string
  minDate?: string
  onChange: (value: string) => void
  value: string
}) {
  const [open, setOpen] = useState(false)

  function choose(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== 'ios' || event.type === 'dismissed') setOpen(false)
    if (event.type === 'set' && selected) {
      onChange(pickerDateToKey(selected))
      if (Platform.OS === 'ios') setOpen(false)
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${value}`}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={styles.button}
      >
        <CalendarDays color={colors.accent} size={20} />
        <Text style={styles.value}>{value}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={maxDate ? dateKeyToPickerDate(maxDate) : undefined}
          minimumDate={minDate ? dateKeyToPickerDate(minDate) : undefined}
          mode="date"
          onChange={choose}
          value={dateKeyToPickerDate(value)}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  value: { color: colors.ink, fontSize: 16 },
})
