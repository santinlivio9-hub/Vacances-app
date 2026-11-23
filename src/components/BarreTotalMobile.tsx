import { useEffect, useState } from 'react'
import { formaterEuros } from '../lib/format'
import { Montant } from './Montant'

interface Props {
  total: number
  parPersonne: number
  /** id du panneau de résultat : la barre se cache quand il est visible */
  cibleId: string
}

/** Sur mobile, le total reste visible en bas de l'écran pendant qu'on remplit le formulaire. */
export function BarreTotalMobile({ total, parPersonne, cibleId }: Props) {
  const [cibleVisible, setCibleVisible] = useState(false)

  useEffect(() => {
    const cible = document.getElementById(cibleId)
    if (!cible || !('IntersectionObserver' in window)) return
    const observateur = new IntersectionObserver(([entree]) => setCibleVisible(entree.isIntersecting), { threshold: 0.15 })
    observateur.observe(cible)
    return () => observateur.disconnect()
  }, [cibleId])

  return (
    <div
      className={`verre fixed inset-x-3 bottom-3 z-20 flex items-center justify-between gap-3 rounded-full py-2 pr-2 pl-5 transition duration-300 [--verre-fond:0.94] print:hidden lg:hidden ${
        cibleVisible ? 'pointer-events-none translate-y-24 opacity-0' : ''
      }`}
    >
      <p className="leading-tight">
        <Montant valeur={total} className="block text-xl font-bold" />
        <span className="text-xs text-slate-600 dark:text-slate-300">{formaterEuros(parPersonne)} / pers.</span>
      </p>
      <button
        type="button"
        tabIndex={cibleVisible ? -1 : 0}
        onClick={() => document.getElementById(cibleId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="min-h-11 rounded-full bg-ocean-600 px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 dark:bg-ocean-500 dark:text-ocean-950"
      >
        Voir le détail
      </button>
    </div>
  )
}
