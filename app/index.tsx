import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, Animated,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Swipeable } from 'react-native-gesture-handler'
import { useRouter, useFocusEffect } from 'expo-router'
import { NoteMode, Note } from '../src/types/note'
import { listNotes, createNote, deleteNote } from '../src/lib/fileSystem'
import { useTheme } from '../src/context/ThemeContext'
import { Font, modeColor } from '../src/theme'

function formatDate(filename: string): string {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})/)
  if (!m) return ''
  const [, date, time] = m
  const [y, mo, d] = date.split('-')
  const [h, min] = time.split('-')
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(min))
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function NoteRow({ note, mode, onPress, onDelete, C, fs }: {
  note: Note; mode: NoteMode; onPress: () => void; onDelete: () => void
  C: ReturnType<typeof useTheme>['C']; fs: (n: number) => number
}) {
  const swipeRef = useRef<Swipeable>(null)
  const color = modeColor(mode, C)
  const preview = mode === 'write'
    ? (note.idea || '').slice(0, 80)
    : (note.admin || note.tasks.map(t => t.text).join(', ')).slice(0, 80)

  const renderRightActions = (_: any, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.8], extrapolate: 'clamp' })
    return (
      <TouchableOpacity
        style={[rowStyles.deleteAction, { backgroundColor: C.danger }]}
        onPress={() => { swipeRef.current?.close(); onDelete() }}
      >
        <Animated.Text style={[rowStyles.deleteActionText, { color: C.text, transform: [{ scale }], fontFamily: Font.regular, fontSize: fs(12) }]}>
          delete
        </Animated.Text>
      </TouchableOpacity>
    )
  }

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} friction={2} rightThreshold={40}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}
        style={[rowStyles.row, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <View style={rowStyles.rowHeader}>
          <Text style={[rowStyles.rowTitle, { color, fontFamily: Font.medium, fontSize: fs(14) }]} numberOfLines={1}>
            {note.title || 'untitled'}
          </Text>
          <Text style={[rowStyles.rowDate, { color: C.text3, fontFamily: Font.regular, fontSize: fs(11) }]}>
            {formatDate(note.filename)}
          </Text>
        </View>
        {!!preview && (
          <Text style={[rowStyles.rowPreview, { color: C.text2, fontFamily: Font.regular, fontSize: fs(12) }]} numberOfLines={2}>
            {preview}
          </Text>
        )}
      </TouchableOpacity>
    </Swipeable>
  )
}

const rowStyles = StyleSheet.create({
  row:             { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  rowHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  rowTitle:        { flex: 1, marginRight: 8 },
  rowDate:         {},
  rowPreview:      {},
  deleteAction:    { justifyContent: 'center', alignItems: 'center', width: 80 },
  deleteActionText:{},
})

export default function HomeScreen() {
  const router = useRouter()
  const { C, fs } = useTheme()
  const [mode, setMode] = useState<NoteMode>('write')
  const [notes, setNotes] = useState<Note[]>([])
  const [initialLoad, setInitialLoad] = useState(true)

  const s = useMemo(() => makeStyles(C, fs), [C, fs])

  const load = useCallback(async () => {
    const result = await listNotes(mode)
    setNotes(result)
    setInitialLoad(false)
  }, [mode])

  useFocusEffect(useCallback(() => { load() }, [load]))
  useEffect(() => { load() }, [mode])

  const handleNew = async () => {
    const note = await createNote(mode)
    router.push(`/note/${note.filename}?mode=${mode}`)
  }

  const handleDelete = async (note: Note) => {
    await deleteNote(note.filename, mode)
    setNotes(prev => prev.filter(n => n.filename !== note.filename))
  }

  const accent = modeColor(mode, C)

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>s†ave</Text>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={() => router.push('/search')} style={[s.headerBtn, { borderColor: C.border2 }]}>
            <Feather name="search" size={fs(14)} color={C.text2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} style={[s.headerBtn, { borderColor: C.border2 }]}>
            <Feather name="settings" size={fs(14)} color={C.text2} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.segmented}>
        {(['write', 'plan'] as NoteMode[]).map(m => (
          <TouchableOpacity key={m} onPress={() => setMode(m)}
            style={[s.segment, mode === m && s.segmentActive]}>
            <Text style={[s.segmentText, { color: mode === m ? modeColor(m, C) : C.text3 }]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {initialLoad ? (
        <View style={s.center}><ActivityIndicator color={accent} /></View>
      ) : notes.length === 0 ? (
        <View style={s.center}><Text style={s.empty}>no {mode} notes yet</Text></View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={n => n.filename}
          renderItem={({ item }) => (
            <NoteRow note={item} mode={mode} C={C} fs={fs}
              onPress={() => router.push(`/note/${item.filename}?mode=${mode}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <TouchableOpacity onPress={handleNew} style={[s.fab, { backgroundColor: accent }]}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

function makeStyles(C: ReturnType<typeof useTheme>['C'], fs: (n: number) => number) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    header:        { paddingTop: 60, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    logo:          { fontFamily: Font.regular, fontSize: fs(18), color: C.text, letterSpacing: 6 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerBtn:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 7 },
    headerBtnText: { fontFamily: Font.regular, fontSize: fs(12), color: C.text2 },
    segmented:     { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: C.bg2, borderRadius: 6, padding: 2 },
    segment:       { flex: 1, paddingVertical: 6, borderRadius: 4, alignItems: 'center' },
    segmentActive: { backgroundColor: C.bg3 },
    segmentText:   { fontFamily: Font.regular, fontSize: fs(12) },
    center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty:         { fontFamily: Font.regular, fontSize: fs(13), color: C.text3 },
    fab:           { position: 'absolute', bottom: 40, right: 24, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    fabText:       { color: C.bg, fontSize: 28, fontFamily: Font.light, lineHeight: 32 },
  })
}
