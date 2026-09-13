import { Redirect, Tabs } from 'expo-router'
import { CalendarDays, House, Menu, Users } from 'lucide-react-native'

import { useAuth } from '@/auth/auth-context'
import { colors } from '@/theme'

export default function TabsLayout() {
  const { status } = useAuth()
  if (status !== 'authenticated') return <Redirect href="/" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          height: 82,
          paddingBottom: 20,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <House color={color} size={size} strokeWidth={1.8} />
          ),
          title: 'Today',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} strokeWidth={1.8} />
          ),
          title: 'Calendar',
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} strokeWidth={1.8} />
          ),
          title: 'Clients',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Menu color={color} size={size} strokeWidth={1.8} />
          ),
          title: 'More',
        }}
      />
    </Tabs>
  )
}
