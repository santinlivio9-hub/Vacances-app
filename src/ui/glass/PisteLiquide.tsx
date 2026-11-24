import { useRef, type HTMLAttributes } from 'react'
import { LiquidSelector, useCibleActive } from './LiquidSelector'

/**
 * Contrôle segmenté en capsule : les enfants marquent l'option choisie avec data-actif="true",
 * et une bulle (tracé SVG animé) glisse dessous. Sert aux interrupteurs, onglets et choix exclusifs.
 */
export function PisteLiquide({
  cle,
  rayon = 12,
  selection = 'fill-white dark:fill-white',
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { cle: unknown; rayon?: number; selection?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { cible, taille } = useCibleActive(ref, cle)
  return (
    <div ref={ref} className={`relative isolate ${className}`} {...props}>
      <LiquidSelector cible={cible} taille={taille} rayon={rayon} className={selection} />
      {children}
    </div>
  )
}

/** Classes d'un onglet posé sur une PisteLiquide (le fond blanc vient de la bulle). */
export const classeOnglet = (actif: boolean) => `relative z-10 transition-colors ${actif ? 'text-[#0c2452]' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`

/** Fond de piste commun : verre fin. */
export const FOND_PISTE = 'rounded-2xl bg-slate-900/5 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] dark:bg-white/8 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] dark:ring-1 dark:ring-white/10'
