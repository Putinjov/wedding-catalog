import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Mail, MessageCircle, Phone, Smartphone } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '@/auth/auth-context'
import { AppointmentCard } from '@/components/appointment-card'
import { AppButton, Card, LoadingBlock, SectionTitle, StateMessage } from '@/components/ui'
import { getClient } from '@/lib/api'
import { callCustomer, emailCustomer, textCustomer, whatsappCustomer } from '@/lib/contact'
import { formatDateTime } from '@/lib/dates'
import { colors, serifFont, spacing } from '@/theme'
import type { ClientProfile } from '@/types'

export default function ClientScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const { session, status } = useAuth()
  const router = useRouter()
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session || !id) return
    setLoading(true)
    setError('')
    try {
      setClient(await getClient(session.token, id))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Client could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [id, session])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  if (status !== 'authenticated') return <Redirect href="/" />
  if (loading) return <LoadingBlock label="Loading client…" />
  if (!client) {
    return (
      <StateMessage
        action={<AppButton label="Try again" onPress={() => void load()} />}
        message={error || 'This client profile is unavailable.'}
        title="Couldn’t open client"
      />
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{client.name}</Text>
        <Text selectable style={styles.contact}>{client.email}</Text>
        <Text selectable style={styles.contact}>{client.phone}</Text>
      </View>

      <View style={styles.contactGrid}>
        <View style={styles.contactItem}>
          <AppButton
            compact
            icon={<Phone color={colors.ink} size={17} />}
            label="Call"
            onPress={() => void callCustomer(client.phone)}
          />
        </View>
        <View style={styles.contactItem}>
          <AppButton
            compact
            icon={<Smartphone color={colors.ink} size={17} />}
            label="SMS"
            onPress={() => void textCustomer(client.phone)}
          />
        </View>
        <View style={styles.contactItem}>
          <AppButton
            compact
            icon={<MessageCircle color={colors.ink} size={17} />}
            label="WhatsApp"
            onPress={() => void whatsappCustomer(client.phone)}
          />
        </View>
        <View style={styles.contactItem}>
          <AppButton
            compact
            icon={<Mail color={colors.ink} size={17} />}
            label="Email"
            onPress={() => void emailCustomer(client.email)}
          />
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label="Appointments" value={String(client.totalAppointments)} />
        <Metric
          label="Next fitting"
          value={client.nextAppointmentAt ? formatDateTime(client.nextAppointmentAt) : 'None'}
        />
      </View>

      <SectionTitle>Client timeline</SectionTitle>
      {client.appointments.length === 0 ? (
        <Card>
          <Text style={styles.contact}>No valid appointment history is available.</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {client.appointments.map((appointment) => (
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
      )}
    </ScrollView>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 72,
  },
  avatarText: { color: colors.accent, fontFamily: serifFont, fontSize: 31, fontWeight: '700' },
  contact: { color: colors.muted, fontSize: 14 },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  contactItem: { width: '48%' },
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: 48 },
  hero: { alignItems: 'center', gap: 4 },
  list: { gap: spacing.md },
  metric: { flex: 1, gap: spacing.xs, minHeight: 94 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  metricValue: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  name: { color: colors.ink, fontFamily: serifFont, fontSize: 30 },
})
