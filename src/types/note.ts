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
  // round-trip preservation — desktop writes these, mobile doesn't edit them,
  // but mobile MUST emit them back on save or desktop data is destroyed
  tagsRaw?: string       // raw "tags: ..." line contents (after prefix)
  recordingsRaw?: string // raw "recordings: ..." line contents
  phasesBlock?: string   // raw body of "## phases" section
  linksBlock?: string    // raw body of "## links" section
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
