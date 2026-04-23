import { Note } from '../types/note'

export function serializeNote(note: Note): string {
  const lines: string[] = []

  lines.push(`# ${note.title}`)
  // Always emit type: so desktop's foreign-file guard trusts mobile-written notes
  lines.push(`type: ${note.mode}`)
  if (note.locked) lines.push('locked: true')

  if (note.mode === 'write') {
    lines.push(`tags: ${note.tagsRaw ?? ''}`)
    if (note.recordingsRaw !== undefined) {
      lines.push(`recordings: ${note.recordingsRaw}`)
    }
    lines.push('')
    lines.push('## idea')
    lines.push(note.idea)
    // Preserve ## context even though mobile has no UI for it — round-tripping
    // a desktop write note must not erase the context section.
    lines.push('')
    lines.push('## context')
    lines.push(note.context)
  } else {
    lines.push(`context1: ${note.planContext}`)
    lines.push('')
    lines.push('## admin')
    lines.push(note.admin)
    lines.push('')
    lines.push('## tasks')
    for (const task of note.tasks) {
      lines.push(`- [${task.done ? 'x' : ' '}] ${task.text}`)
      if (task.id) {
        lines.push(`  id: ${task.id}`)
      }
      if (task.reminder) {
        lines.push(`  reminder: ${task.reminder}`)
      }
    }
    // Always emit ## phases and ## links to match desktop's schema. If mobile
    // didn't parse any (new note), the sections are empty but present.
    lines.push('')
    lines.push('## phases')
    if (note.phasesBlock) lines.push(note.phasesBlock)
    lines.push('')
    lines.push('## links')
    if (note.linksBlock) lines.push(note.linksBlock)
  }

  return lines.join('\n')
}
