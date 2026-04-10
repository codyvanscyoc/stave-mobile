import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, StyleSheet,
  InputAccessoryView, Keyboard,
} from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as LocalAuthentication from 'expo-local-authentication'
import { Feather } from '@expo/vector-icons'
import { NoteMode, Note } from '../../src/types/note'
import { readNote, saveNote } from '../../src/lib/fileSystem'
import { extractTasks } from '../../src/lib/taskExtract'
import { scheduleReminder, cancelReminder } from '../../src/lib/notifications'
import { useTheme } from '../../src/context/ThemeContext'
import { Font, modeColor } from '../../src/theme'

const AUTOSAVE_MS = 800
const KB_TOOLBAR_ID = 'stave-kb-toolbar'

// Convert "- " at the start of a new line to "• " (matching desktop)
function applyBulletConversion(text: string): string {
  return text.replace(/(^|\n)- /g, '$1• ')
}

export default function NoteScreen() {
  const { filename, mode: modeParam } = useLocalSearchParams<{ filename: string; mode: NoteMode }>()
  const mode: NoteMode = modeParam === 'plan' ? 'plan' : 'write'
  const navigation = useNavigation()
  const { C, fs } = useTheme()
  const insets = useSafeAreaInsets()

  const [note, setNote]               = useState<Note | null>(null)
  const [tasksOpen, setTasksOpen]     = useState(false)
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)
  const [pickerDate, setPickerDate]   = useState<Date>(new Date())
  const [authPassed, setAuthPassed]   = useState(false)
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestNote = useRef<Note | null>(null)

  useEffect(() => {
    readNote(filename, mode).then(async n => {
      setNote(n)
      latestNote.current = n
      if (n.locked) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'unlock note',
          fallbackLabel: 'use passcode',
          disableDeviceFallback: false,
        })
        if (result.success) setAuthPassed(true)
      } else {
        setAuthPassed(true)
      }
    })
  }, [filename, mode])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (latestNote.current) saveNote(latestNote.current)
    }
  }, [])

  const scheduleAutoSave = useCallback((updated: Note) => {
    latestNote.current = updated
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNote(updated), AUTOSAVE_MS)
  }, [])

  const update = useCallback(<K extends keyof Note>(key: K, value: Note[K]) => {
    setNote(prev => {
      if (!prev) return prev
      const updated = { ...prev, [key]: value }
      scheduleAutoSave(updated)
      return updated
    })
  }, [scheduleAutoSave])

  const toggleLock = useCallback(() => {
    if (!note) return
    if (!note.locked) {
      // Lock immediately — no auth needed (like locking your phone)
      update('locked', true)
      setAuthPassed(false)  // hide content right away
    } else {
      // Already authenticated to view — remove lock permanently
      update('locked', false)
    }
  }, [note, update])

  useEffect(() => {
    if (!note) return
    navigation.setOptions({
      title: note.title || 'untitled',
      headerRight: () => (
        <TouchableOpacity onPress={toggleLock} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
          <Feather
            name={note.locked ? 'lock' : 'unlock'}
            size={15}
            color={note.locked ? C.accent : C.text3}
          />
        </TouchableOpacity>
      ),
    })
  }, [note?.title, note?.locked, toggleLock, C])

  const handleExtractTasks = () => {
    if (!note) return
    const found = extractTasks(`${note.admin}\n${note.planContext}`, note.tasks.map(t => t.text))
    if (found.length === 0) { Alert.alert('Extract Tasks', 'No new tasks found.'); return }
    update('tasks', [...note.tasks, ...found.map(text => ({ text, done: false }))])
    setTasksOpen(true)
  }

  const toggleTask     = (i: number) => { if (!note) return; update('tasks', note.tasks.map((t, idx) => idx === i ? { ...t, done: !t.done } : t)) }
  const updateTaskText = (i: number, text: string) => { if (!note) return; update('tasks', note.tasks.map((t, idx) => idx === i ? { ...t, text } : t)) }
  const deleteTask     = (i: number) => { if (!note) return; update('tasks', note.tasks.filter((_, idx) => idx !== i)) }
  const addTask        = () => { if (!note) return; update('tasks', [...note.tasks, { text: '', done: false }]); setTasksOpen(true) }

  const openReminderPicker = (i: number) => {
    const existing = note?.tasks[i]?.reminder
    setPickerDate(existing ? new Date(existing) : (() => { const d = new Date(); d.setMinutes(d.getMinutes() + 60); return d })())
    setPickerIndex(i)
    Keyboard.dismiss()
  }

  const confirmReminder = async (date: Date) => {
    if (!note || pickerIndex === null) return
    setPickerIndex(null)
    const key = `${note.filename}-${pickerIndex}`
    const iso = date.toISOString()
    await scheduleReminder(key, note.title, note.tasks[pickerIndex]?.text ?? '', date)
    update('tasks', note.tasks.map((t, idx) => idx === pickerIndex ? { ...t, reminder: iso } : t))
  }

  const clearReminder = async (i: number) => {
    if (!note) return
    await cancelReminder(`${note.filename}-${i}`)
    update('tasks', note.tasks.map((t, idx) => idx === i ? { ...t, reminder: undefined } : t))
  }

  const s = useMemo(() => makeStyles(C, fs), [C, fs])

  if (!note) {
    return <View style={s.loading}><Text style={s.loadingText}>loading...</Text></View>
  }

  if (note.locked && !authPassed) {
    return (
      <View style={s.loading}>
        <Feather name="lock" size={28} color={C.accent} />
        {!!note.title && (
          <Text style={[s.loadingText, { marginTop: 16, color: C.text }]}>{note.title}</Text>
        )}
        <TouchableOpacity
          style={[s.unlockBtn, { borderColor: C.accent }]}
          onPress={async () => {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'unlock note',
              fallbackLabel: 'use passcode',
              disableDeviceFallback: false,
            })
            if (result.success) setAuthPassed(true)
          }}
        >
          <Text style={[s.unlockBtnText, { color: C.accent }]}>unlock</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isWrite    = mode === 'write'
  const accent     = modeColor(mode, C)
  const borderAccent = isWrite ? 'rgba(200,146,42,0.3)' : 'rgba(76,175,125,0.3)'
  const doneCount  = note.tasks.filter(t => t.done).length
  const taskCount  = note.tasks.length
  // safe area bottom: at least 20pt so toggle sits clear of the home indicator bevel
  const bottomPad  = Math.max(insets.bottom, 20)

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={88}
    >
      {/* Keyboard dismiss toolbar */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={KB_TOOLBAR_ID}>
          <View style={[s.kbToolbar, { backgroundColor: C.bg2, borderTopColor: C.border }]}>
            <TouchableOpacity onPress={() => Keyboard.dismiss()} style={s.kbDoneBtn}>
              <Text style={[s.kbDoneText, { color: accent }]}>done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}

      {/* Main scrollable content */}
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <TextInput
          style={[s.title, { color: C.text, borderBottomColor: borderAccent }]}
          placeholder="untitled"
          placeholderTextColor={C.text3}
          value={note.title}
          onChangeText={v => update('title', v)}
          returnKeyType="done"
          inputAccessoryViewID={KB_TOOLBAR_ID}
        />

        {isWrite ? (
          <TextInput
            style={[s.idea, { color: C.text }]}
            placeholder="idea..."
            placeholderTextColor={C.text3}
            value={note.idea}
            onChangeText={v => update('idea', applyBulletConversion(v))}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
            inputAccessoryViewID={KB_TOOLBAR_ID}
          />
        ) : (
          <>
            <TextInput
              style={[s.planContext, { color: C.text2, borderBottomColor: C.border }]}
              placeholder="meeting context..."
              placeholderTextColor={C.text3}
              value={note.planContext}
              onChangeText={v => update('planContext', v)}
              returnKeyType="done"
              inputAccessoryViewID={KB_TOOLBAR_ID}
            />
            <Text style={[s.sectionLabel, { color: accent }]}>notes</Text>
            <TextInput
              style={[s.admin, { color: C.text }]}
              placeholder="brain dump..."
              placeholderTextColor={C.text3}
              value={note.admin}
              onChangeText={v => update('admin', applyBulletConversion(v))}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
              inputAccessoryViewID={KB_TOOLBAR_ID}
              // Auto-collapse tasks when user starts typing notes
              onFocus={() => setTasksOpen(false)}
            />
            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {/* Tasks panel — pinned to bottom, plan mode only */}
      {!isWrite && (
        <View style={[s.taskPanel, { backgroundColor: C.bg, borderTopColor: borderAccent, paddingBottom: bottomPad }]}>

          {/* Toggle bar */}
          <TouchableOpacity
            onPress={() => { Keyboard.dismiss(); setTasksOpen(o => !o) }}
            style={[s.tasksToggle, { borderBottomColor: tasksOpen ? C.border : 'transparent' }]}
          >
            <Text style={[s.tasksToggleLabel, { color: accent }]}>tasks</Text>
            {taskCount > 0 && (
              <Text style={[s.tasksCount, { color: C.text3 }]}>{doneCount}/{taskCount} done</Text>
            )}
            <Text style={[s.tasksChevron, { color: C.text3 }]}>{tasksOpen ? '▼' : '▲'}</Text>
          </TouchableOpacity>

          {/* Expanded task list */}
          {tasksOpen && (
            <>
              <View style={[s.tasksActions, { borderBottomColor: C.border }]}>
                <TouchableOpacity onPress={handleExtractTasks} style={[s.extractBtn, { borderColor: accent }]}>
                  <Text style={[s.extractBtnText, { color: accent }]}>extract</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addTask}>
                  <Text style={[s.addBtn, { color: accent }]}>+ add</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={s.taskScroll} keyboardShouldPersistTaps="handled">
                {note.tasks.length === 0 ? (
                  <Text style={[s.noTasks, { color: C.text3 }]}>no tasks yet</Text>
                ) : (
                  note.tasks.map((task, i) => (
                    <View key={i} style={[s.taskRow, { borderBottomColor: C.border }]}>
                      {/* Circle — teal/amber when done */}
                      <TouchableOpacity onPress={() => toggleTask(i)} style={s.checkboxWrap}>
                        <View style={[
                          s.circle,
                          { borderColor: task.done ? accent : C.border2 },
                          task.done && { backgroundColor: accent },
                        ]}>
                          {task.done && <Text style={[s.checkmark, { color: C.bg }]}>✓</Text>}
                        </View>
                      </TouchableOpacity>

                      {/* Text + reminder row */}
                      <View style={s.taskTextWrap}>
                        {/* Done: Text with strikethrough. Undone: TextInput */}
                        {task.done ? (
                          <TouchableOpacity onPress={() => toggleTask(i)}>
                            <Text style={[s.taskTextDone, { color: C.text3 }]}>
                              {task.text || ''}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TextInput
                            style={[s.taskText, { color: C.text }]}
                            value={task.text}
                            onChangeText={t => updateTaskText(i, t)}
                            multiline
                            textAlignVertical="top"
                            placeholder="task..."
                            placeholderTextColor={C.text3}
                            scrollEnabled={false}
                            inputAccessoryViewID={KB_TOOLBAR_ID}
                          />
                        )}
                        {/* Reminder row */}
                        {task.reminder ? (
                          <View style={s.reminderRow}>
                            <TouchableOpacity onPress={() => openReminderPicker(i)}>
                              <Text style={[s.reminderText, { color: task.done ? C.teal : C.accent }]}>
                                {new Date(task.reminder).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => clearReminder(i)} style={s.reminderClear}>
                              <Text style={[s.reminderClearText, { color: C.text3 }]}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          !task.done && (
                            <TouchableOpacity onPress={() => openReminderPicker(i)}>
                              <Text style={[s.addReminder, { color: C.accent }]}>+ reminder</Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>

                      <TouchableOpacity onPress={() => deleteTask(i)} style={s.deleteTask}>
                        <Text style={[s.deleteTaskText, { color: C.text3 }]}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
                <View style={{ height: 8 }} />
              </ScrollView>
            </>
          )}
        </View>
      )}

      {/* Date/time picker for reminders (iOS inline, Android modal) */}
      {pickerIndex !== null && (
        <View style={[s.pickerSheet, { backgroundColor: C.bg2, borderTopColor: C.border }]}>
          <View style={[s.pickerHeader, { borderBottomColor: C.border }]}>
            <TouchableOpacity onPress={() => setPickerIndex(null)}>
              <Text style={[s.pickerCancel, { color: C.text3 }]}>cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmReminder(pickerDate)}>
              <Text style={[s.pickerDone, { color: accent }]}>set reminder</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={pickerDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => { if (date) setPickerDate(date) }}
            minimumDate={new Date()}
            style={{ backgroundColor: C.bg2 }}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

function makeStyles(C: ReturnType<typeof import('../../src/context/ThemeContext').useTheme>['C'], fs: (n: number) => number) {
  return StyleSheet.create({
    container:        { flex: 1, backgroundColor: C.bg },
    loading:          { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
    loadingText:      { fontFamily: Font.regular, fontSize: fs(13), color: C.text2 },
    unlockBtn:        { marginTop: 24, borderWidth: 1, borderRadius: 6, paddingHorizontal: 24, paddingVertical: 10 },
    unlockBtnText:    { fontFamily: Font.regular, fontSize: fs(13) },
    scroll:           { flex: 1 },
    kbToolbar:        { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', justifyContent: 'flex-end' },
    kbDoneBtn:        { paddingHorizontal: 8, paddingVertical: 4 },
    kbDoneText:       { fontFamily: Font.medium, fontSize: fs(14) },
    title:            { fontFamily: Font.medium, fontSize: fs(15), paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
    idea:             { fontFamily: Font.regular, fontSize: fs(14), paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, minHeight: 500 },
    sectionLabel:     { fontFamily: Font.regular, fontSize: fs(11), paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
    planContext:      { fontFamily: Font.regular, fontSize: fs(12), paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
    admin:            { fontFamily: Font.regular, fontSize: fs(14), paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, minHeight: 300 },
    // task panel
    taskPanel:        { borderTopWidth: 1 },
    tasksToggle:      { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 20, paddingVertical: 12, gap: 8, borderBottomWidth: 1 },
    tasksToggleLabel: { fontFamily: Font.regular, fontSize: fs(11) },
    tasksCount:       { fontFamily: Font.regular, fontSize: fs(11), flex: 1 },
    tasksChevron:     { fontFamily: Font.regular, fontSize: fs(10) },
    tasksActions:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1 },
    extractBtn:       { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
    extractBtnText:   { fontFamily: Font.regular, fontSize: fs(11) },
    addBtn:           { fontFamily: Font.regular, fontSize: fs(11) },
    taskScroll:       { maxHeight: 260 },
    taskRow:          { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 20, paddingRight: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1 },
    checkboxWrap:     { paddingTop: 2 },
    circle:           { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    checkmark:        { fontSize: fs(10), lineHeight: 14, fontFamily: Font.medium },
    taskTextWrap:     { flex: 1, paddingTop: 1 },
    taskTextDone:     { fontFamily: Font.regular, fontSize: fs(14), textDecorationLine: 'line-through' },
    taskText:         { fontFamily: Font.regular, fontSize: fs(14), padding: 0 },
    deleteTask:       { paddingHorizontal: 4, paddingTop: 2 },
    deleteTaskText:   { fontSize: fs(18), lineHeight: 22 },
    noTasks:          { fontFamily: Font.regular, fontSize: fs(12), paddingHorizontal: 20, paddingVertical: 14 },
    // reminder
    reminderRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
    reminderText:     { fontFamily: Font.regular, fontSize: fs(11) },
    reminderClear:    { padding: 2 },
    reminderClearText:{ fontSize: fs(14), lineHeight: 18 },
    addReminder:      { fontFamily: Font.regular, fontSize: fs(11), marginTop: 4 },
    // picker sheet
    pickerSheet:      { borderTopWidth: 1 },
    pickerHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
    pickerCancel:     { fontFamily: Font.regular, fontSize: fs(13) },
    pickerDone:       { fontFamily: Font.medium, fontSize: fs(13) },
  })
}
