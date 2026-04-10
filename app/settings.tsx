import { useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { useTheme, FONT_SIZES, DEFAULT_FONT_SIZE } from '../src/context/ThemeContext'
import { Font, ThemeName } from '../src/theme'
import { replaySplash } from '../src/lib/splashReplay'

const NOTES_ROOT = `${FileSystem.documentDirectory}Stave/`

const THEME_OPTIONS: { name: ThemeName; label: string; bg: string; text: string }[] = [
  { name: 'stave',    label: 'stave',    bg: '#1c1c1e', text: '#f0e8d8' },
  { name: 'terminal', label: 'terminal', bg: '#0b0d0b', text: '#33ff88' },
  { name: 'midnight', label: 'midnight', bg: '#000000', text: '#e8e0d0' },
  { name: 'light',    label: 'light',    bg: '#f0ede8', text: '#1c1c1e' },
]

export default function SettingsScreen() {
  const { C, fs, themeName, setTheme, fontSize, increaseFontSize, decreaseFontSize, canIncrease, canDecrease } = useTheme()
  const s = useMemo(() => makeStyles(C, fs), [C, fs])

  return (
    <ScrollView style={s.container}>

      {/* Theme */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>theme</Text>
        <View style={s.card}>
          {THEME_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.name}
              onPress={() => setTheme(opt.name)}
              style={[s.themeRow, i < THEME_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
            >
              {/* Mini preview swatch */}
              <View style={[s.swatch, { backgroundColor: opt.bg, borderColor: C.border2 }]}>
                <Text style={[s.swatchText, { color: opt.text }]}>Aa</Text>
              </View>
              <Text style={[s.themeLabel, { color: themeName === opt.name ? C.accent : C.text }]}>
                {opt.label}
              </Text>
              {themeName === opt.name && (
                <Text style={[s.check, { color: C.accent }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Font size stepper */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>text size</Text>
        <View style={[s.card, s.stepperCard]}>
          <TouchableOpacity
            onPress={decreaseFontSize}
            disabled={!canDecrease}
            style={s.stepperBtn}
          >
            <Text style={[s.stepperBtnText, { color: canDecrease ? C.text : C.text3 }]}>−</Text>
          </TouchableOpacity>

          <View style={s.stepperCenter}>
            <Text style={[s.stepperValue, { color: C.accent }]}>{fontSize}px</Text>
            {fontSize === DEFAULT_FONT_SIZE && (
              <Text style={[s.stepperDefault, { color: C.text3 }]}>default</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={increaseFontSize}
            disabled={!canIncrease}
            style={s.stepperBtn}
          >
            <Text style={[s.stepperBtnText, { color: canIncrease ? C.text : C.text3 }]}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={[s.hint, { color: C.text3 }]}>
          range {FONT_SIZES[0]}–{FONT_SIZES[FONT_SIZES.length - 1]}px · persists locally
        </Text>
      </View>

      {/* Storage */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>storage</Text>
        <View style={s.card}>
          <Text style={[s.cardLabel, { color: C.text2 }]}>notes folder</Text>
          <Text style={[s.cardValue, { color: C.text3 }]} numberOfLines={2}>{NOTES_ROOT}</Text>
        </View>
        <Text style={[s.hint, { color: C.text3 }]}>
          notes are saved locally. iCloud Drive sync coming in a future update.
        </Text>
      </View>

      {/* About */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>about</Text>
        <View style={s.card}>
          <Text style={[s.appName, { color: C.text }]}>s†ave</Text>
          <TouchableOpacity onPress={replaySplash} activeOpacity={0.6}>
            <Text style={[s.version, { color: C.text2 }]}>version 1.0.0</Text>
          </TouchableOpacity>
          <Text style={[s.tagline, { color: C.text3 }]}>a minimal note-taking app for creative thinkers.</Text>
        </View>
      </View>

    </ScrollView>
  )
}

function makeStyles(C: ReturnType<typeof useTheme>['C'], fs: (n: number) => number) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },
    section:      { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 4 },
    sectionLabel: { fontFamily: Font.regular, fontSize: fs(10), color: C.text3, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
    card:         { backgroundColor: C.bg2, borderRadius: 10, overflow: 'hidden' },
    // theme rows
    themeRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
    swatch:       { width: 36, height: 24, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    swatchText:   { fontFamily: Font.regular, fontSize: 9 },
    themeLabel:   { fontFamily: Font.regular, fontSize: fs(14), flex: 1 },
    check:        { fontFamily: Font.medium, fontSize: fs(14) },
    // font size stepper
    stepperCard:  { flexDirection: 'row', alignItems: 'center' },
    stepperBtn:   { paddingHorizontal: 24, paddingVertical: 16 },
    stepperBtnText:{ fontFamily: Font.light, fontSize: fs(24) },
    stepperCenter: { flex: 1, alignItems: 'center' },
    stepperValue:  { fontFamily: Font.medium, fontSize: fs(18) },
    stepperDefault:{ fontFamily: Font.regular, fontSize: fs(10), marginTop: 2 },
    hint:          { fontFamily: Font.regular, fontSize: fs(11), lineHeight: 17, marginTop: 8, color: C.text3 },
    // storage / about
    cardLabel:    { fontFamily: Font.regular, fontSize: fs(11), paddingHorizontal: 14, paddingTop: 13, marginBottom: 3 },
    cardValue:    { fontFamily: Font.regular, fontSize: fs(11), paddingHorizontal: 14, paddingBottom: 13 },
    appName:      { fontFamily: Font.regular, fontSize: fs(14), paddingHorizontal: 14, paddingTop: 13, marginBottom: 3 },
    version:      { fontFamily: Font.regular, fontSize: fs(11), paddingHorizontal: 14, marginBottom: 6 },
    tagline:      { fontFamily: Font.regular, fontSize: fs(11), paddingHorizontal: 14, paddingBottom: 13 },
  })
}
