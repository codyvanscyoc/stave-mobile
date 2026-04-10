import * as FileSystem from 'expo-file-system/legacy'
import { Note, NoteMode, EMPTY_NOTE } from '../types/note'
import { parseNote } from './parseNote'
import { serializeNote } from './serializeNote'

// Root notes directory inside the app's documents folder
const NOTES_ROOT = `${FileSystem.documentDirectory}Stave/`
const WRITE_DIR  = `${NOTES_ROOT}write/`
const PLAN_DIR   = `${NOTES_ROOT}plan/`

export async function ensureDirectories(): Promise<void> {
  await FileSystem.makeDirectoryAsync(WRITE_DIR, { intermediates: true })
  await FileSystem.makeDirectoryAsync(PLAN_DIR,  { intermediates: true })
}

function dirForMode(mode: NoteMode): string {
  return mode === 'write' ? WRITE_DIR : PLAN_DIR
}

export function generateFilename(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)               // 2026-04-10
  const time = now.toTimeString().slice(0, 5).replace(':', '-') // 12-30
  return `${date}_${time}.md`
}

export async function listNotes(mode: NoteMode): Promise<Note[]> {
  const dir = dirForMode(mode)
  try {
    const files = await FileSystem.readDirectoryAsync(dir)
    const mdFiles = files.filter(f => f.endsWith('.md')).sort().reverse()

    const notes = await Promise.all(
      mdFiles.map(async (filename) => {
        const path = `${dir}${filename}`
        const raw = await FileSystem.readAsStringAsync(path)
        const info = await FileSystem.getInfoAsync(path)
        const note = parseNote(raw, filename, mode)
        note.mtime = info.exists && 'modificationTime' in info ? info.modificationTime : undefined
        return note
      })
    )
    return notes
  } catch {
    return []
  }
}

export async function readNote(filename: string, mode: NoteMode): Promise<Note> {
  const path = `${dirForMode(mode)}${filename}`
  try {
    const raw = await FileSystem.readAsStringAsync(path)
    const info = await FileSystem.getInfoAsync(path)
    const note = parseNote(raw, filename, mode)
    note.mtime = info.exists && 'modificationTime' in info ? info.modificationTime : undefined
    return note
  } catch {
    return EMPTY_NOTE(mode, filename)
  }
}

export async function saveNote(note: Note): Promise<void> {
  const path = `${dirForMode(note.mode)}${note.filename}`
  const raw = serializeNote(note)
  await FileSystem.writeAsStringAsync(path, raw, { encoding: FileSystem.EncodingType.UTF8 })
}

export async function deleteNote(filename: string, mode: NoteMode): Promise<void> {
  const path = `${dirForMode(mode)}${filename}`
  await FileSystem.deleteAsync(path, { idempotent: true })
}

export async function createNote(mode: NoteMode): Promise<Note> {
  const filename = generateFilename()
  const note = EMPTY_NOTE(mode, filename)
  await saveNote(note)
  return note
}

export async function checkExternalModification(
  filename: string,
  mode: NoteMode,
  knownMtime: number | undefined,
): Promise<boolean> {
  if (!knownMtime) return false
  const path = `${dirForMode(mode)}${filename}`
  const info = await FileSystem.getInfoAsync(path)
  if (!info.exists || !('modificationTime' in info)) return false
  // Modified externally if disk time is newer than what we loaded
  return info.modificationTime > knownMtime + 1
}
