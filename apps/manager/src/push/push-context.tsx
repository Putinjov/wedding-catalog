import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { useRouter } from 'expo-router'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AppState, Platform } from 'react-native'

import { useAuth } from '@/auth/auth-context'
import { registerDevice, unregisterDevice, type DeviceRegistration } from '@/lib/api'

const pushTokenKey = 'cait-bridal-manager-push-token'
const pushPreferenceKey = 'cait-bridal-manager-push-preference'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export type PushState = 'denied' | 'disabled' | 'enabled' | 'error' | 'unsupported'

type PushContextValue = {
  disable: () => Promise<void>
  enable: () => Promise<void>
  error: string
  state: PushState
}

const PushContext = createContext<PushContextValue | null>(null)

function getProjectId(): string | null {
  if (Constants.easConfig?.projectId) return Constants.easConfig.projectId
  const configured = Constants.expoConfig?.extra?.eas
  if (configured && typeof configured === 'object' && 'projectId' in configured) {
    return typeof configured.projectId === 'string' && configured.projectId
      ? configured.projectId
      : null
  }
  return process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? null
}

function getPlatform(): DeviceRegistration['platform'] | null {
  if (Platform.OS === 'android' || Platform.OS === 'ios') return Platform.OS
  return null
}

async function getRegistration(): Promise<DeviceRegistration | null> {
  const token = await SecureStore.getItemAsync(pushTokenKey)
  const platform = getPlatform()
  if (!token || !platform) return null
  return {
    deviceName: Device.deviceName ?? Device.modelName ?? undefined,
    platform,
    token,
  }
}

export function PushProvider({ children }: PropsWithChildren) {
  const { session } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<PushState>('disabled')
  const [error, setError] = useState('')

  const synchronise = useCallback(
    async (requestPermission: boolean) => {
      if (!session || !Device.isDevice || !getPlatform()) {
        setState(Device.isDevice ? 'disabled' : 'unsupported')
        return
      }
      if (!requestPermission) {
        const preference = await SecureStore.getItemAsync(pushPreferenceKey)
        if (preference === 'disabled') {
          setState('disabled')
          return
        }
      }
      const projectId = getProjectId()
      if (!projectId) {
        setError('Push is not configured for this build yet.')
        setState('error')
        return
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('appointments', {
          importance: Notifications.AndroidImportance.HIGH,
          name: 'Appointments',
          sound: 'default',
        })
      }

      let permission = await Notifications.getPermissionsAsync()
      if (permission.status !== 'granted' && requestPermission) {
        permission = await Notifications.requestPermissionsAsync()
      }
      if (permission.status !== 'granted') {
        setState(permission.canAskAgain ? 'disabled' : 'denied')
        return
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
      const platform = getPlatform()
      if (!platform) return
      const registration: DeviceRegistration = {
        deviceName: Device.deviceName ?? Device.modelName ?? undefined,
        platform,
        token,
      }
      await registerDevice(session.token, registration)
      await SecureStore.setItemAsync(pushTokenKey, token)
      await SecureStore.setItemAsync(pushPreferenceKey, 'enabled')
      setError('')
      setState('enabled')
    },
    [session],
  )

  useEffect(() => {
    if (!session) {
      void Promise.resolve().then(() => setState('disabled'))
      return
    }
    void Promise.resolve()
      .then(() => synchronise(false))
      .catch(() => {
        setState('error')
        setError('Notifications could not be connected.')
      })
  }, [session, synchronise])

  useEffect(() => {
    const clearBadge = () => {
      void Notifications.setBadgeCountAsync(0).catch(() => undefined)
    }
    clearBadge()
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') clearBadge()
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void Notifications.setBadgeCountAsync(0).catch(() => undefined)
      const data = response.notification.request.content.data
      if (data?.type === 'appointment' && typeof data.appointmentId === 'string') {
        router.push({ pathname: '/appointment/[id]', params: { id: data.appointmentId } })
      }
    })
    return () => subscription.remove()
  }, [router])

  const enable = useCallback(async () => {
    try {
      await synchronise(true)
    } catch {
      setState('error')
      setError('Notifications could not be enabled. Please try again.')
    }
  }, [synchronise])

  const disable = useCallback(async () => {
    const registration = await getRegistration()
    if (session && registration) {
      try {
        await unregisterDevice(session.token, registration)
      } catch {
        // The lock-screen notification contains no customer details. Clear the local token even offline.
      }
    }
    await SecureStore.deleteItemAsync(pushTokenKey)
    await SecureStore.setItemAsync(pushPreferenceKey, 'disabled')
    setError('')
    setState('disabled')
  }, [session])

  const value = useMemo(() => ({ disable, enable, error, state }), [disable, enable, error, state])
  return <PushContext.Provider value={value}>{children}</PushContext.Provider>
}

export function usePush(): PushContextValue {
  const value = useContext(PushContext)
  if (!value) throw new Error('usePush must be used inside PushProvider.')
  return value
}
