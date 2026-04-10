export type NoteMode = 'write' | 'plan'

export interface Task {
  text: string
  done: boolean
  reminder?: string // ISO date string e.g. "2026-04-08T09:00"
}

export interface Note {
  filename: string       // e.g. "2026-04-10_12-30.md"
  mode: NoteMode
  title: string
  // write fields
  idea: string
  context: string
  // plan fields
  planContext: string
  admin: string
  tasks: Task[]
  // meta
  mtime?: number         // file modification time (ms since epoch)
  locked?: boolean       // requires biometric auth to view
}

export const EMPTY_NOTE = (mode: NoteMode, filename: string): Note => ({
  filename,
  mode,
  title: '',
  idea: '',
  context: '',
  planContext: '',
  admin: '',
  tasks: [],
})
