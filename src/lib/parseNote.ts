import { Note, NoteMode, Task } from '../types/note'

export function parseNote(raw: string, filename: string, mode: NoteMode): Note {
  const lines = raw.split('\n')
  let title = ''
  let planContext = ''
  let locked = false
  let tagsRaw: string | undefined
  let recordingsRaw: string | undefined
  let section = ''
  const ideaLines: string[] = []
  const contextLines: string[] = []
  const adminLines: string[] = []
  const phasesLines: string[] = []
  const linksLines: string[] = []
  const tasks: Task[] = []

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.slice(2).trim()
      continue
    }
    if (line.startsWith('type: ')) continue // mode is derived from directory
    if (line.startsWith('tags: ')) { tagsRaw = line.slice(6); continue }
    if (line.startsWith('recordings: ')) { recordingsRaw = line.slice(12); continue }
    if (line === 'locked: true') { locked = true; continue }
    if (line.startsWith('context1: ')) {
      planContext = line.slice(10).trim()
      continue
    }
    if (line === '## idea')    { section = 'idea';    continue }
    if (line === '## context') { section = 'context'; continue }
    if (line === '## admin')   { section = 'admin';   continue }
    if (line === '## tasks')   { section = 'tasks';   continue }
    if (line === '## phases')  { section = 'phases';  continue }
    if (line === '## links')   { section = 'links';   continue }

    if (section === 'tasks') {
      const taskMatch = line.match(/^- \[(x| )\] (.+)/)
      if (taskMatch) {
        const task: Task = { text: taskMatch[2].trim(), done: taskMatch[1] === 'x' }
        tasks.push(task)
        continue
      }
      // reminder line attached to previous task
      const reminderMatch = line.match(/^\s+reminder: (.+)/)
      if (reminderMatch && tasks.length > 0) {
        tasks[tasks.length - 1].reminder = reminderMatch[1].trim()
        continue
      }
      // id line attached to previous task — links a phase copy on desktop
      const idMatch = line.match(/^\s+id: (.+)/)
      if (idMatch && tasks.length > 0) {
        tasks[tasks.length - 1].id = idMatch[1].trim()
        continue
      }
      continue
    }

    if (section === 'idea')    { ideaLines.push(line);    continue }
    if (section === 'context') { contextLines.push(line); continue }
    if (section === 'admin')   { adminLines.push(line);   continue }
    // Phases and links aren't edited on mobile, but their raw bytes MUST be
    // preserved or desktop's data is erased on round-trip.
    if (section === 'phases')  { phasesLines.push(line);  continue }
    if (section === 'links')   { linksLines.push(line);   continue }
  }

  // Drop leading blank line that always follows "## phases" / "## links" headers
  while (phasesLines.length && phasesLines[0] === '') phasesLines.shift()
  while (linksLines.length  && linksLines[0]  === '') linksLines.shift()

  return {
    filename,
    mode,
    title,
    idea: ideaLines.join('\n').trim(),
    context: contextLines.join('\n').trim(),
    planContext,
    admin: adminLines.join('\n').trim(),
    tasks,
    locked,
    tagsRaw,
    recordingsRaw,
    phasesBlock: phasesLines.length ? phasesLines.join('\n') : undefined,
    linksBlock:  linksLines.length  ? linksLines.join('\n')  : undefined,
  }
}
