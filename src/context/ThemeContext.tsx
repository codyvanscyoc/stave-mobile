import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ThemeName, ThemeColors, THEMES } from '../theme'

// Font sizes match desktop: [11, 12, 13, 14, 15, 16, 17], default 14
export const FONT_SIZES = [11, 12, 13, 14, 15, 16, 17]
export const DEFAULT_FONT_SIZE = 14

interface ThemeContextValue {
  themeName: ThemeName
  C: ThemeColors
  fontSize: number        // actual px value e.g. 14
  setTheme: (name: ThemeName) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  canIncrease: boolean
  canDecrease: boolean
  // scale a base size relative to the default
  fs: (base: number) => number
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const THEME_KEY    = '@stave_theme'
const FONTSIZE_KEY = '@stave_fontsize'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('stave')
  const [fontSize, setFontSizeState] = useState<number>(DEFAULT_FONT_SIZE)

  useEffect(() => {
    AsyncStorage.multiGet([THEME_KEY, FONTSIZE_KEY]).then(pairs => {
      let theme = pairs[0][1] as ThemeName | null
      const size  = pairs[1][1]
      // migrate old 'terminal' (now 'stave') stored value
      if ((theme as string) === 'terminal_legacy') theme = 'stave'
      if (theme && THEMES[theme]) setThemeName(theme)
      if (size) {
        const parsed = parseInt(size, 10)
        if (FONT_SIZES.includes(parsed)) setFontSizeState(parsed)
      }
    })
  }, [])

  const setTheme = (name: ThemeName) => {
    setThemeName(name)
    AsyncStorage.setItem(THEME_KEY, name)
  }

  const setFontSize = (size: number) => {
    setFontSizeState(size)
    AsyncStorage.setItem(FONTSIZE_KEY, String(size))
  }

  const idx = FONT_SIZES.indexOf(fontSize)
  const canIncrease = idx < FONT_SIZES.length - 1
  const canDecrease = idx > 0

  const increaseFontSize = () => { if (canIncrease) setFontSize(FONT_SIZES[idx + 1]) }
  const decreaseFontSize = () => { if (canDecrease) setFontSize(FONT_SIZES[idx - 1]) }

  // Scale any base size proportionally to the chosen font size
  const fs = (base: number) => Math.round(base * (fontSize / DEFAULT_FONT_SIZE))

  return (
    <ThemeContext.Provider value={{
      themeName,
      C: THEMES[themeName],
      fontSize,
      setTheme,
      increaseFontSize,
      decreaseFontSize,
      canIncrease,
      canDecrease,
      fs,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
