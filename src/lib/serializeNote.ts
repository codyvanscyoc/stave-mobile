import { Note } from '../types/note'

export function serializeNote(note: Note): string {
  const lines: string[] = []

  if (note.mode === 'write') {
    lines.push(`# ${note.title}`)
    if (note.locked) lines.push('locked: true')
    lines.push(`tags: `)
    lines.push('')
    lines.push('## idea')
    lines.push(note.idea)
    // context omitted on mobile — preserved if already in file via parseNote
  } else {
    lines.push(`# ${note.title}`)
    if (note.locked) lines.push('locked: true')
    lines.push(`context1: ${note.planContext}`)
    lines.push('')
    lines.push('## admin')
    lines.push(note.admin)
    lines.push('')
    lines.push('## tasks')
    for (const task of note.tasks) {
      lines.push(`- [${task.done ? 'x' : ' '}] ${task.text}`)
      if (task.reminder) {
        lines.push(`  reminder: ${task.reminder}`)
      }
    }
  }

  return lines.join('\n')
}
