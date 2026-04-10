import { Note, NoteMode, Task } from '../types/note'

export function parseNote(raw: string, filename: string, mode: NoteMode): Note {
  const lines = raw.split('\n')
  let title = ''
  let planContext = ''
  let locked = false
  let section = ''
  const ideaLines: string[] = []
  const contextLines: string[] = []
  const adminLines: string[] = []
  const tasks: Task[] = []

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.slice(2).trim()
      continue
    }
    if (line.startsWith('tags: ')) continue // skip tags on mobile
    if (line === 'locked: true') { locked = true; continue }
    if (line.startsWith('context1: ')) {
      planContext = line.slice(10).trim()
      continue
    }
    if (line === '## idea')    { section = 'idea';    continue }
    if (line === '## context') { section = 'context'; continue }
    if (line === '## admin')   { section = 'admin';   continue }
    if (line === '## tasks')   { section = 'tasks';   continue }
    // stop at sections we don't handle on mobile
    if (line === '## phases' || line === '## links') { section = 'skip'; continue }

    if (section === 'skip') continue

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
      continue
    }

    if (section === 'idea')    { ideaLines.push(line);    continue }
    if (section === 'context') { contextLines.push(line); continue }
    if (section === 'admin')   { adminLines.push(line);   continue }
  }

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
  }
}
