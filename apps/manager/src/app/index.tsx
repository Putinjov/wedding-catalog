import { Redirect } from 'expo-router'
import { useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useAuth } from '@/auth/auth-context'
import { AppButton, FormInput } from '@/components/ui'
import { ApiError, apiOrigin } from '@/lib/api'
import { colors, radius, serifFont, spacing } from '@/theme'

export default function LoginScreen() {
  const { login, status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Redirect href="/(tabs)" />

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (loginError) {
      setError(
        loginError instanceof ApiError && loginError.status === 401
          ? 'Email or password is incorrect.'
          : loginError instanceof Error
            ? loginError.message
            : 'Sign in failed. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image
            accessibilityLabel="CAIT Bridal"
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.eyebrow}>CAIT BRIDAL</Text>
          <Text style={styles.title}>Manager</Text>
          <Text style={styles.subtitle}>Appointments, clients and daily follow-up.</Text>
        </View>

        <View style={styles.form}>
          <FormInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="manager@caitbridal.ie"
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
          />
          <FormInput
            autoCapitalize="none"
            autoComplete="current-password"
            label="Password"
            onChangeText={setPassword}
            onSubmitEditing={() => void submit()}
            placeholder="Your password"
            returnKeyType="go"
            secureTextEntry
            textContentType="password"
            value={password}
          />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <AppButton label="Sign in" loading={busy} onPress={() => void submit()} variant="primary" />
        </View>
        <Text style={styles.server}>{apiOrigin.replace(/^https?:\/\//, '')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginBottom: spacing.xxl },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2.4 },
  form: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  logo: { borderRadius: 56, height: 112, marginBottom: spacing.lg, width: 112 },
  root: { backgroundColor: colors.canvas, flex: 1 },
  server: { color: colors.muted, fontSize: 12, marginTop: spacing.xl, textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: spacing.sm, textAlign: 'center' },
  title: { color: colors.ink, fontFamily: serifFont, fontSize: 38, marginTop: spacing.xs },
})
