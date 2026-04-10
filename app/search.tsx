import { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Note, NoteMode } from '../src/types/note'
import { listNotes } from '../src/lib/fileSystem'
import { useTheme } from '../src/context/ThemeContext'
import { Font, modeColor } from '../src/theme'

function matchesQuery(note: Note, q: string): boolean {
  const lower = q.toLowerCase()
  return (
    note.title.toLowerCase().includes(lower) ||
    note.idea.toLowerCase().includes(lower) ||
    note.admin.toLowerCase().includes(lower) ||
    note.planContext.toLowerCase().includes(lower) ||
    note.tasks.some(t => t.text.toLowerCase().includes(lower))
  )
}

function getPreview(note: Note, q: string): string {
  const lower = q.toLowerCase()
  const fields = [note.idea, note.admin, note.planContext, ...note.tasks.map(t => t.text)]
  for (const f of fields) {
    if (f.toLowerCase().includes(lower)) {
      const idx = f.toLowerCase().indexOf(lower)
      const start = Math.max(0, idx - 30)
      return (start > 0 ? '…' : '') + f.slice(start, start + 100)
    }
  }
  return ''
}

export default function SearchScreen() {
  const router = useRouter()
  const { C, fs } = useTheme()
  const [query, setQuery] = useState('')
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [modeFilter, setModeFilter] = useState<NoteMode | 'all'>('all')

  const s = useMemo(() => makeStyles(C, fs), [C, fs])

  useEffect(() => {
    Promise.all([listNotes('write'), listNotes('plan')]).then(([w, p]) => {
      setAllNotes([...w, ...p])
      setLoading(false)
    })
  }, [])

  const filtered = allNotes.filter(n => {
    if (modeFilter !== 'all' && n.mode !== modeFilter) return false
    if (!query.trim()) return true
    return matchesQuery(n, query.trim())
  })

  return (
    <View style={s.container}>
      <View style={s.inputWrap}>
        <TextInput style={s.input} placeholder="search notes..." placeholderTextColor={C.text3}
          value={query} onChangeText={setQuery} autoFocus clearButtonMode="while-editing" />
      </View>

      <View style={s.filters}>
        {(['all', 'write', 'plan'] as const).map(m => (
          <TouchableOpacity key={m} onPress={() => setModeFilter(m)}
            style={[s.filterBtn, modeFilter === m && s.filterBtnActive]}>
            <Text style={[s.filterText, {
              color: modeFilter === m
                ? (m === 'write' ? C.accent : m === 'plan' ? C.teal : C.text)
                : C.text3,
            }]}>{m}</Text>
          </TouchableOpacity>
        ))}
        <Text style={s.count}>{filtered.length} note{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.text3} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={n => `${n.mode}-${n.filename}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const preview = query.trim() ? getPreview(item, query.trim()) : ''
            return (
              <TouchableOpacity style={s.result}
                onPress={() => { router.back(); setTimeout(() => router.push(`/note/${item.filename}?mode=${item.mode}`), 100) }}>
                <View style={s.resultHeader}>
                  <Text style={[s.resultMode, { color: modeColor(item.mode, C) }]}>{item.mode}</Text>
                  <Text style={s.resultTitle} numberOfLines={1}>{item.title || 'untitled'}</Text>
                </View>
                {!!preview && <Text style={s.resultPreview} numberOfLines={2}>{preview}</Text>}
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.empty}>{query.trim() ? 'no results' : 'no notes yet'}</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

function makeStyles(C: ReturnType<typeof useTheme>['C'], fs: (n: number) => number) {
  return StyleSheet.create({
    container:       { flex: 1, backgroundColor: C.bg },
    inputWrap:       { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    input:           { backgroundColor: C.bg2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontFamily: Font.regular, fontSize: fs(14), color: C.text },
    filters:         { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'center' },
    filterBtn:       { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: C.border },
    filterBtnActive: { backgroundColor: C.bg2, borderColor: C.border2 },
    filterText:      { fontFamily: Font.regular, fontSize: fs(11) },
    count:           { fontFamily: Font.regular, fontSize: fs(11), color: C.text3, marginLeft: 'auto' },
    center:          { paddingTop: 60, alignItems: 'center' },
    empty:           { fontFamily: Font.regular, fontSize: fs(13), color: C.text3 },
    result:          { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    resultHeader:    { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 },
    resultMode:      { fontFamily: Font.regular, fontSize: fs(11) },
    resultTitle:     { fontFamily: Font.medium, fontSize: fs(14), color: C.text, flex: 1 },
    resultPreview:   { fontFamily: Font.regular, fontSize: fs(12), color: C.text2 },
  })
}
