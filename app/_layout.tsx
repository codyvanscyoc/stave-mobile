import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Modal } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  useFonts,
  JetBrainsMono_300Light,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono'
import { ensureDirectories } from '../src/lib/fileSystem'
import { ThemeProvider, useTheme } from '../src/context/ThemeContext'
import { Font } from '../src/theme'
import { registerSplashReplay } from '../src/lib/splashReplay'

const SPLASH_MIN_MS = 2200

function AppShell() {
  const { C } = useTheme()
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerTitleStyle: { fontFamily: Font.regular, fontSize: 14 },
          contentStyle: { backgroundColor: C.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="note/[filename]" options={{ title: '', headerBackTitle: 'notes' }} />
        <Stack.Screen name="search" options={{ title: 'search', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'settings', presentation: 'modal' }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [minTimeUp, setMinTimeUp] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const opacity = useRef(new Animated.Value(1)).current
  const animating = useRef(false)

  const [fontsLoaded] = useFonts({
    JetBrainsMono_300Light,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  })

  useEffect(() => {
    ensureDirectories().then(() => setReady(true))
    const t = setTimeout(() => setMinTimeUp(true), SPLASH_MIN_MS)
    return () => clearTimeout(t)
  }, [])

  const fadeOut = () => {
    if (animating.current) return
    animating.current = true
    Animated.timing(opacity, {
      toValue: 0,
      duration: 700,
      useNativeDriver: true,
    }).start(() => {
      setShowSplash(false)
      animating.current = false
    })
  }

  // Initial fade — wait for fonts, dirs, and minimum time
  useEffect(() => {
    if (fontsLoaded && ready && minTimeUp) {
      fadeOut()
    }
  }, [fontsLoaded, ready, minTimeUp])

  // Register replay function for settings screen
  useEffect(() => {
    registerSplashReplay(() => {
      opacity.setValue(1)
      setShowSplash(true)
      animating.current = false
      setTimeout(fadeOut, SPLASH_MIN_MS)
    })
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* App always mounts once fonts + dirs are ready */}
      {fontsLoaded && ready && (
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      )}

      {/* Splash overlay — only shown once fonts are loaded so † renders in JetBrains Mono, not system fallback */}
      <Modal visible={showSplash && fontsLoaded} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[s.splash, { opacity }]} pointerEvents="none">
          <View style={s.splashRing}>
            <Text style={s.splashText}>s†ave</Text>
          </View>
        </Animated.View>
      </Modal>
    </GestureHandlerRootView>
  )
}

const s = StyleSheet.create({
  splash:     { ...StyleSheet.absoluteFillObject, backgroundColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center' },
  splashRing: { borderWidth: 1, borderColor: '#4caf7d', borderRadius: 60, paddingHorizontal: 28, paddingVertical: 18 },
  splashText: { fontFamily: Font.regular, fontSize: 22, color: '#f0e8d8', letterSpacing: 6 },
})
