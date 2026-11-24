import { useEffect } from 'react'
import { usePreferences, type EffetVerre, type Theme } from '../store/preferences'

const requeteSombre = '(prefers-color-scheme: dark)'

/** Pose la classe .dark sur <html> selon le thème choisi (« auto » suit le système). */
export function appliquerTheme(theme: Theme) {
  const sombre = theme === 'sombre' || (theme === 'auto' && window.matchMedia(requeteSombre).matches)
  document.documentElement.classList.toggle('dark', sombre)
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', sombre ? '#050b1f' : '#eef8fb')
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

/**
 * Effet verre : « auto » donne l'effet léger sur mobile (moins de flou, plus fluide et moins
 * gourmand en batterie) et complet sur ordinateur. La réfraction SVG ne marche que dans Chrome
 * (Safari et Firefox ignorent un filtre SVG dans backdrop-filter) : on l'active seulement là.
 */
export function effetVerreEffectif(e: EffetVerre): Exclude<EffetVerre, 'auto'> {
  if (e !== 'auto') return e
  return window.matchMedia('(pointer: coarse), (max-width: 640px)').matches ? 'leger' : 'complet'
}

export function useEffetVerre() {
  const effet = usePreferences((p) => p.effetVerre)
  useEffect(() => {
    const racine = document.documentElement
    racine.dataset.verre = effetVerreEffectif(effet)
    const marques = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands ?? []
    racine.dataset.refraction = marques.some((m) => /Chromium|Google Chrome/.test(m.brand)) ? 'oui' : 'non'
  }, [effet])
}
