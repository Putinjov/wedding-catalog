import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native'

import { cardShadow, colors, radius, serifFont, spacing, titleText } from '@/theme'

export function ScreenHeader({
  action,
  eyebrow,
  subtitle,
  title,
}: {
  action?: ReactNode
  eyebrow?: string
  subtitle?: string
  title: string
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function AppButton({
  compact = false,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  variant = 'secondary',
}: {
  compact?: boolean
  disabled?: boolean
  icon?: ReactNode
  label: string
  loading?: boolean
  onPress: () => void
  variant?: 'danger' | 'primary' | 'secondary' | 'soft'
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'danger' && styles.buttonDanger,
        variant === 'soft' && styles.buttonSoft,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.ink} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.buttonLabel,
              (variant === 'primary' || variant === 'danger') && styles.buttonLabelInverse,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  )
}

export function FormInput({
  helper,
  label,
  multiline,
  ...props
}: TextInputProps & { helper?: string; label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && styles.multiline]}
        {...props}
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  )
}

export function StateMessage({
  action,
  message,
  title,
}: {
  action?: ReactNode
  message: string
  title: string
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  )
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.helper}>{label}</Text>
    </View>
  )
}

export function ChoiceChips<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void
  options: { label: string; value: T }[]
  value: T
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
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
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonCompact: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  buttonLabel: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  buttonLabelInverse: { color: '#FFFFFF' },
  buttonPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  buttonSoft: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
  card: {
    ...cardShadow,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  chipLabelSelected: { color: '#FFFFFF' },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  disabled: { opacity: 0.5 },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  field: { gap: 7 },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerCopy: { flex: 1 },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: 48 },
  multiline: { minHeight: 112, textAlignVertical: 'top' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  sectionTitle: {
    color: colors.ink,
    fontFamily: serifFont,
    fontSize: 22,
    fontWeight: '500',
  },
  state: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: 52 },
  stateAction: { marginTop: spacing.md, minWidth: 180 },
  stateMessage: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  stateTitle: { color: colors.ink, fontFamily: serifFont, fontSize: 23 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  title: titleText,
})
