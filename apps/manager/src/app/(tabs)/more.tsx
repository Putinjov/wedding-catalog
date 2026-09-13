import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { Bell, BellOff, ExternalLink, LogOut, ShieldCheck } from 'lucide-react-native'
import { useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/auth/auth-context'
import { AppButton, Card, ScreenHeader, SectionTitle } from '@/components/ui'
import { apiOrigin } from '@/lib/api'
import { usePush } from '@/push/push-context'
import { colors, spacing } from '@/theme'

export default function MoreScreen() {
  const { logout, session } = useAuth()
  const push = usePush()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await push.disable()
    await logout()
    router.replace('/')
  }

  const pushLabel = {
    denied: 'Blocked in phone settings',
    disabled: 'Off',
    enabled: 'On',
    error: 'Needs attention',
    unsupported: 'Physical device required',
  }[push.state]

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader eyebrow="Account & app" title="More" />

        <Card>
          <Text style={styles.userName}>{session?.user.name || session?.user.email}</Text>
          {session?.user.name ? <Text style={styles.userEmail}>{session.user.email}</Text> : null}
          <View style={styles.roleRow}>
            <ShieldCheck color={colors.success} size={17} />
            <Text style={styles.role}>{session?.user.role ?? 'staff'}</Text>
          </View>
        </Card>

        <SectionTitle>Notifications</SectionTitle>
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            {push.state === 'enabled' ? (
              <Bell color={colors.accent} size={23} />
            ) : (
              <BellOff color={colors.muted} size={23} />
            )}
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Appointment alerts</Text>
              <Text style={styles.settingBody}>{pushLabel}</Text>
              {push.error ? <Text style={styles.error}>{push.error}</Text> : null}
            </View>
          </View>
          {push.state === 'enabled' ? (
            <AppButton
              compact
              label="Disable on this phone"
              onPress={() => void push.disable()}
            />
          ) : push.state === 'denied' ? (
            <AppButton
              compact
              label="Open phone settings"
              onPress={() => void Linking.openSettings()}
              variant="soft"
            />
          ) : push.state !== 'unsupported' ? (
            <AppButton
              compact
              label="Enable notifications"
              onPress={() => void push.enable()}
              variant="soft"
            />
          ) : null}
        </Card>

        <SectionTitle>Administration</SectionTitle>
        <AppButton
          icon={<ExternalLink color={colors.ink} size={18} />}
          label="Open full Payload Admin"
          onPress={() => void Linking.openURL(`${apiOrigin}/admin`)}
        />

        <AppButton
          icon={<LogOut color="#FFFFFF" size={18} />}
          label="Sign out"
          loading={signingOut}
          onPress={() => void signOut()}
          variant="danger"
        />
        <Text style={styles.version}>
          CAIT Bridal Manager {Constants.expoConfig?.version ?? '0.1.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: 40 },
  error: { color: colors.danger, fontSize: 12, marginTop: 2 },
  role: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  roleRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: spacing.md },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  settingBody: { color: colors.muted, fontSize: 13 },
  settingCard: { gap: spacing.lg },
  settingCopy: { flex: 1, gap: 3 },
  settingRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  settingTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  userEmail: { color: colors.muted, fontSize: 14, marginTop: 4 },
  userName: { color: colors.ink, fontFamily: 'Georgia', fontSize: 24 },
  version: { color: colors.muted, fontSize: 12, textAlign: 'center' },
})
