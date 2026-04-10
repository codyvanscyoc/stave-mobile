// Port of scoreSentence() from the desktop renderer.js
const ACTION_WORDS = new Set([
  'call', 'send', 'write', 'email', 'get', 'buy', 'fix', 'check', 'review',
  'schedule', 'book', 'contact', 'finish', 'complete', 'submit', 'update',
  'order', 'record', 'print', 'prepare', 'add', 'promote', 'post', 'share',
  'create', 'build', 'design', 'launch', 'film', 'message', 'meet',
  'finalize', 'draft', 'research', 'follow', 'invite', 'confirm', 'deliver',
  'edit', 'assign', 'publish',
])

function scoreSentence(s: string): number {
  const trimmed = s.trim()
  if (!trimmed) return 0

  // Bullets always qualify
  if (/^[•\-]/.test(trimmed)) return 10
  // >> prefix always qualifies
  if (trimmed.startsWith('>>')) return 10

  const lower = trimmed.toLowerCase()
  const firstWord = lower.split(/\s+/)[0].replace(/[^a-z]/g, '')

  // Action word at start
  if (ACTION_WORDS.has(firstWord)) return 5

  // Need/must/should phrases
  if (/^(need to|have to|must|should)\b/.test(lower)) return 4

  return 0
}

export function extractTasks(text: string, existingTasks: string[]): string[] {
  const existing = new Set(existingTasks.map(t => t.trim().toLowerCase()))
  const results: string[] = []

  const sentences = text
    .split(/[\n.!?]+/)
    .map(s => s.trim())
    .filter(Boolean)

  for (const s of sentences) {
    if (scoreSentence(s) >= 4) {
      // Strip leading bullet/dash/>>
      const clean = s.replace(/^[•\-]\s*/, '').replace(/^>>\s*/, '').trim()
      if (clean && !existing.has(clean.toLowerCase())) {
        results.push(clean)
      }
    }
  }

  return results
}
