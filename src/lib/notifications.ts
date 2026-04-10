import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Show alert when notification arrives while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function ensurePermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  if (status === 'granted') return true
  const { status: newStatus } = await Notifications.requestPermissionsAsync()
  return newStatus === 'granted'
}

// key: unique per task e.g. "2026-04-10_12-30.md-0"
export async function scheduleReminder(
  key: string,
  noteTitle: string,
  taskText: string,
  date: Date,
): Promise<void> {
  await cancelReminder(key)
  if (date <= new Date()) return
  const ok = await ensurePermission()
  if (!ok) return
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: noteTitle || 'stave reminder',
      body: taskText,
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  })
  await AsyncStorage.setItem(`@notif_${key}`, id)
}

export async function cancelReminder(key: string): Promise<void> {
  const id = await AsyncStorage.getItem(`@notif_${key}`)
  if (id) {
    try { await Notifications.cancelScheduledNotificationAsync(id) } catch {}
    await AsyncStorage.removeItem(`@notif_${key}`)
  }
}
