import { useEffect } from 'react'

/** Éléments qui reçoivent le reflet qui suit le doigt ou la souris (voir .eclat dans index.css). */
export const SELECTEUR_ECLAT = '.eclat, .bouton-accent'

/**
 * Filtre SVG de réfraction : déforme légèrement ce qui est vu à travers le bord du verre.
 * Utilisé par backdrop-filter: url(#refraction-verre) dans Chrome uniquement (voir index.css).
 */
export function FiltresVerre() {
  // Reflet de lumière qui suit le pointeur : un seul écouteur pour toute l'app, qui place --mx / --my
  useEffect(() => {
    const suivre = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(SELECTEUR_ECLAT)
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    window.addEventListener('pointermove', suivre, { passive: true })
    window.addEventListener('pointerdown', suivre, { passive: true })
    return () => {
      window.removeEventListener('pointermove', suivre)
      window.removeEventListener('pointerdown', suivre)
    }
  }, [])
  return (
    <svg aria-hidden width="0" height="0" className="pointer-events-none absolute">
      <filter id="refraction-verre" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="bruit" />
        <feGaussianBlur in="bruit" stdDeviation="2" result="doux" />
        <feDisplacementMap in="SourceGraphic" in2="doux" scale="18" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}
