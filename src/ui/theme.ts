import { useEffect } from 'react'
import { usePreferences, type Theme } from '../store/preferences'

const requeteSombre = '(prefers-color-scheme: dark)'

/** Pose la classe .dark sur <html> selon le thème choisi (« auto » suit le système). */
export function appliquerTheme(theme: Theme) {
  const sombre = theme === 'sombre' || (theme === 'auto' && window.matchMedia(requeteSombre).matches)
  document.documentElement.classList.toggle('dark', sombre)
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', sombre ? '#0a2535' : '#eef8fb')
}

/** Suit le thème choisi et, en automatique, les changements du système. */
export function useTheme() {
  const theme = usePreferences((p) => p.theme)
  useEffect(() => {
    appliquerTheme(theme)
    if (theme !== 'auto') return
    const mq = window.matchMedia(requeteSombre)
    const suivre = () => appliquerTheme('auto')
    mq.addEventListener('change', suivre)
    return () => mq.removeEventListener('change', suivre)
  }, [theme])
}
