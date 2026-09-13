import type { TextStyle, ViewStyle } from 'react-native'

export const colors = {
  accent: '#7A5E78',
  accentSoft: '#EDE3EC',
  canvas: '#FAF8F6',
  card: '#FFFFFF',
  danger: '#A33D42',
  dangerSoft: '#F7E8E7',
  gold: '#B98A42',
  ink: '#2C2621',
  line: '#E6E1D9',
  muted: '#7D766F',
  secondary: '#EDE7E0',
  success: '#3D7152',
  successSoft: '#E7F1EA',
  warning: '#906526',
  warningSoft: '#F8EEDC',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const

export const serifFont = 'Georgia'

export const cardShadow: ViewStyle = {
  shadowColor: '#2C2621',
  shadowOffset: { height: 5, width: 0 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 2,
}

export const titleText: TextStyle = {
  color: colors.ink,
  fontFamily: serifFont,
  fontSize: 32,
  fontWeight: '500',
  letterSpacing: -0.6,
}
