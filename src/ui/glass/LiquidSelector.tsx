import { animate, motion, useMotionValue, type MotionValue } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { ressorts } from '../tokens'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Position de l'élément actif (marqué data-actif="true") dans son conteneur, remesurée quand
 * l'élément actif change ou que le conteneur change de taille.
 */
export function useCibleActive(conteneur: RefObject<HTMLElement | null>, cle: unknown): { cible: Rect | null; taille: { w: number; h: number } } {
  const [etat, setEtat] = useState<{ cible: Rect | null; taille: { w: number; h: number } }>({ cible: null, taille: { w: 0, h: 0 } })
  useLayoutEffect(() => {
    const c = conteneur.current
    if (!c) return
    const mesurer = () => {
      const actif = c.querySelector<HTMLElement>('[data-actif="true"]')
      const rc = c.getBoundingClientRect()
      const ra = actif?.getBoundingClientRect()
      setEtat({ taille: { w: rc.width, h: rc.height }, cible: ra ? { x: ra.left - rc.left, y: ra.top - rc.top, w: ra.width, h: ra.height } : null })
    }
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(c)
    c.querySelectorAll('[data-actif]').forEach((e) => ro.observe(e))
    return () => ro.disconnect()
  }, [conteneur, cle])
  return etat
}

const reduit = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Deux bords animés par des ressorts différents : celui qui avance part vite, celui qui suit
 * traîne un peu. Pendant le déplacement, la forme s'étire comme une goutte, puis se resserre.
 */
function useBords(debut: number, fin: number): [MotionValue<number>, MotionValue<number>] {
  const a = useMotionValue(debut)
  const b = useMotionValue(fin)
  const premier = useRef(true)
  useEffect(() => {
    if (premier.current || reduit()) {
      premier.current = false
      a.set(debut)
      b.set(fin)
      return
    }
    const versLaFin = debut > a.get()
    const ca = animate(a, debut, { type: 'spring', ...(versLaFin ? ressorts.derriere : ressorts.devant) })
    const cb = animate(b, fin, { type: 'spring', ...(versLaFin ? ressorts.devant : ressorts.derriere) })
    return () => {
      ca.stop()
      cb.stop()
    }
  }, [debut, fin, a, b])
  return [a, b]
}

/** Rectangle arrondi (capsule si le rayon vaut la moitié de la hauteur). */
function capsule(l: number, t: number, r: number, b: number, rayon: number) {
  const k = Math.max(0, Math.min(rayon, (r - l) / 2, (b - t) / 2))
  return `M${l + k},${t}H${r - k}A${k},${k} 0 0 1 ${r},${t + k}V${b - k}A${k},${k} 0 0 1 ${r - k},${b}H${l + k}A${k},${k} 0 0 1 ${l},${b - k}V${t + k}A${k},${k} 0 0 1 ${l + k},${t}Z`
}

/**
 * Sélection et rail fondus en une seule forme : l'onglet choisi « coule » dans le rail blanc,
 * avec des raccords arrondis vers l'intérieur au-dessus et au-dessous (référence « Glassy Sidebar »).
 */
function ongletEtRail(xl: number, t: number, b: number, xr: number, xR: number, H: number, R: number, r: number, f: number) {
  const ff = Math.max(0, Math.min(f, t - R, H - R - b))
  return [
    `M${xr + R},0H${xR - R}A${R},${R} 0 0 1 ${xR},${R}V${H - R}A${R},${R} 0 0 1 ${xR - R},${H}H${xr + R}A${R},${R} 0 0 1 ${xr},${H - R}`,
    `V${b + ff}A${ff},${ff} 0 0 0 ${xr - ff},${b}H${xl + r}A${r},${r} 0 0 1 ${xl},${b - r}V${t + r}A${r},${r} 0 0 1 ${xl + r},${t}H${xr - ff}A${ff},${ff} 0 0 0 ${xr},${t - ff}`,
    `V${R}A${R},${R} 0 0 1 ${xr + R},0Z`,
  ].join('')
}

/**
 * Sélection « liquide » dessinée par un seul tracé SVG animé.
 * - horizontal / vertical : une capsule qui glisse sous l'élément actif (barre d'onglets, barre repliée) ;
 * - rail : la sélection se fond dans un rail à droite (barre latérale ouverte).
 */
export function LiquidSelector({
  cible,
  taille,
  mode = 'horizontal',
  rail = 0,
  rayon = 9999,
  marge = 0,
  className = 'fill-white',
}: {
  cible: Rect | null
  taille: { w: number; h: number }
  mode?: 'horizontal' | 'vertical' | 'rail'
  /** Largeur du rail (mode rail) */
  rail?: number
  rayon?: number
  /** Retrait de la sélection autour de l'élément */
  marge?: number
  className?: string
}) {
  const c = cible ?? { x: 0, y: 0, w: 0, h: 0 }
  const horizontal = mode === 'horizontal'
  const [debut, fin] = useBords(horizontal ? c.x + marge : c.y + marge, horizontal ? c.x + c.w - marge : c.y + c.h - marge)
  // Le tracé se recalcule à chaque image de l'animation, et quand la géométrie change
  const construire = (a: number, b: number) => {
    if (taille.w === 0) return ''
    // Sans élément actif, le rail reste seul
    if (!cible) return mode === 'rail' ? capsule(taille.w - rail, 0, taille.w, taille.h, Math.min(28, rail / 2)) : ''
    if (horizontal) return capsule(a, c.y + marge, b, c.y + c.h - marge, rayon)
    if (mode === 'vertical') return capsule(c.x + marge, a, c.x + c.w - marge, b, rayon)
    const xR = taille.w
    return ongletEtRail(c.x + marge, a, b, xR - rail, xR, taille.h, Math.min(28, rail / 2), Math.min(rayon, (b - a) / 2), 18)
  }
  const derniere = useRef(construire)
  derniere.current = construire
  const d = useMotionValue('')
  useLayoutEffect(() => {
    d.set(derniere.current(debut.get(), fin.get()))
  })
  useEffect(() => {
    const maj = () => d.set(derniere.current(debut.get(), fin.get()))
    const u1 = debut.on('change', maj)
    const u2 = fin.on('change', maj)
    return () => {
      u1()
      u2()
    }
  }, [debut, fin, d])
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={taille.w} height={taille.h} viewBox={`0 0 ${Math.max(1, taille.w)} ${Math.max(1, taille.h)}`}>
      <motion.path d={d} className={`${className} drop-shadow-[0_6px_14px_rgb(5_11_31/0.35)]`} />
    </svg>
  )
}
