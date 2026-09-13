import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronRight, Search } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/auth/auth-context'
import { AppButton, LoadingBlock, ScreenHeader, StateMessage } from '@/components/ui'
import { getClients } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'
import { colors, radius, spacing } from '@/theme'
import type { ClientDirectoryEntry } from '@/types'

export default function ClientsScreen() {
  const { session } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const searchRef = useRef(search)
  const skippedInitialSearchEffect = useRef(false)

  const load = useCallback(
    async (refresh = false, query = '') => {
      if (!session) return
      if (refresh) setRefreshing(true)
      else setLoading(true)
      setError('')
      try {
        setClients(await getClients(session.token, query))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Clients could not be loaded.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [session],
  )

  useFocusEffect(
    useCallback(() => {
      void load(false, searchRef.current)
    }, [load]),
  )

  useEffect(() => {
    searchRef.current = search
    if (!skippedInitialSearchEffect.current) {
      skippedInitialSearchEffect.current = true
      return
    }
    const timer = setTimeout(() => void load(false, search), 350)
    return () => clearTimeout(timer)
  }, [load, search])

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            onRefresh={() => void load(true, searchRef.current)}
            refreshing={refreshing}
          />
        }
      >
        <ScreenHeader
          eyebrow="CRM"
          subtitle="Profiles are built from booking history."
          title="Clients"
        />
        <View style={styles.search}>
          <Search color={colors.muted} size={19} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Name, email or phone"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={search}
          />
        </View>

        {loading ? <LoadingBlock label="Loading clients…" /> : null}
        {!loading && error ? (
          <StateMessage
            action={
              <AppButton
                label="Try again"
                onPress={() => void load(false, searchRef.current)}
              />
            }
            message={error}
            title="Couldn’t load clients"
          />
        ) : null}
        {!loading && !error && clients.length === 0 ? (
          <StateMessage
            message={
              search
                ? 'No client matches this search.'
                : 'Client profiles appear after the first booking.'
            }
            title={search ? 'No results' : 'No clients yet'}
          />
        ) : null}
        <View style={styles.list}>
          {clients.map((client) => (
            <Pressable
              key={client.id}
              onPress={() =>
                router.push({ pathname: '/client/[id]', params: { id: client.id } })
              }
              style={({ pressed }) => [styles.client, pressed && styles.pressed]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.clientCopy}>
                <Text style={styles.name}>{client.name}</Text>
                <Text numberOfLines={1} style={styles.email}>
                  {client.email}
                </Text>
                <Text style={styles.meta}>
                  {client.nextAppointmentAt
                    ? `Next: ${formatDateTime(client.nextAppointmentAt)}`
                    : `${client.totalAppointments} appointment${client.totalAppointments === 1 ? '' : 's'}`}
                </Text>
              </View>
              <ChevronRight color={colors.muted} size={19} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: colors.accent, fontFamily: 'Georgia', fontSize: 21, fontWeight: '700' },
  client: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  clientCopy: { flex: 1, gap: 3 },
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: 40 },
  email: { color: colors.muted, fontSize: 13 },
  list: {
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  meta: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 2 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  pressed: { backgroundColor: colors.secondary },
  safe: { backgroundColor: colors.canvas, flex: 1 },
  search: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 14,
  },
  searchInput: { color: colors.ink, flex: 1, fontSize: 16, minHeight: 50 },
})
