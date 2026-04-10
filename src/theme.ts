export type ThemeName = 'stave' | 'terminal' | 'midnight' | 'light'

export interface ThemeColors {
  bg: string; bg2: string; bg3: string
  border: string; border2: string
  text: string; text2: string; text3: string
  accent: string; accent2: string
  teal: string; purple: string; blue: string; danger: string
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  stave: {
    bg:      '#1c1c1e',
    bg2:     '#252528',
    bg3:     '#2e2e32',
    border:  'rgba(255,255,255,0.07)',
    border2: 'rgba(255,255,255,0.13)',
    text:    '#f0e8d8',
    text2:   '#9a9080',
    text3:   '#4e4a44',
    accent:  '#c8922a',
    accent2: '#a07420',
    teal:    '#4caf7d',
    purple:  '#7f77dd',
    blue:    '#378add',
    danger:  '#c0392b',
  },
  terminal: {
    bg:      '#0b0d0b',
    bg2:     '#111511',
    bg3:     '#182018',
    border:  'rgba(51,255,136,0.08)',
    border2: 'rgba(51,255,136,0.16)',
    text:    '#33ff88',
    text2:   '#1ab865',
    text3:   '#0a5c33',
    accent:  '#f0c040',
    accent2: '#c09030',
    teal:    '#33ff88',
    purple:  '#9988ff',
    blue:    '#44aaff',
    danger:  '#ff4444',
  },
  midnight: {
    bg:      '#000000',
    bg2:     '#0a0a0c',
    bg3:     '#111115',
    border:  'rgba(255,255,255,0.06)',
    border2: 'rgba(255,255,255,0.11)',
    text:    '#e8e0d0',
    text2:   '#857870',
    text3:   '#403c38',
    accent:  '#c8922a',
    accent2: '#a07420',
    teal:    '#4caf7d',
    purple:  '#7f77dd',
    blue:    '#378add',
    danger:  '#c0392b',
  },
  light: {
    bg:      '#f0ede8',
    bg2:     '#e3e0db',
    bg3:     '#d5d2cd',
    border:  'rgba(0,0,0,0.07)',
    border2: 'rgba(0,0,0,0.13)',
    text:    '#1c1c1e',
    text2:   '#5a5550',
    text3:   '#9a9590',
    accent:  '#a07420',
    accent2: '#7a5a18',
    teal:    '#2e8a58',
    purple:  '#6058c0',
    blue:    '#2060b0',
    danger:  '#c0392b',
  },
}

export const Font = {
  light:   'JetBrainsMono_300Light',
  regular: 'JetBrainsMono_400Regular',
  medium:  'JetBrainsMono_500Medium',
} as const

// Helpers used by screens before theme context is available (static defaults)
export const C = THEMES.stave

export function modeColor(mode: 'write' | 'plan', colors: ThemeColors): string {
  return mode === 'write' ? colors.accent : colors.teal
}
