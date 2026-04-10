let _replay: (() => void) | null = null

export function registerSplashReplay(fn: () => void): void {
  _replay = fn
}

export function replaySplash(): void {
  _replay?.()
}
