import { useEffect, useRef, useState } from 'react'

const DUREE_MS = 450

const mouvementReduit = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Fait glisser un nombre vers sa nouvelle valeur (désactivé si l'utilisateur limite les animations). */
export function useValeurAnimee(cible: number): number {
  const [affichee, setAffichee] = useState(cible)
  const depart = useRef(cible)

  useEffect(() => {
    const debut = depart.current
    if (debut === cible || mouvementReduit()) {
      depart.current = cible
      setAffichee(cible)
      return
    }
    const t0 = performance.now()
    let image = 0
    const etape = (t: number) => {
      const avancement = Math.min(1, (t - t0) / DUREE_MS)
      const adouci = 1 - (1 - avancement) ** 3
      const valeur = debut + (cible - debut) * adouci
      depart.current = valeur
      setAffichee(valeur)
      if (avancement < 1) image = requestAnimationFrame(etape)
    }
    image = requestAnimationFrame(etape)
    return () => cancelAnimationFrame(image)
  }, [cible])

  return affichee
}
