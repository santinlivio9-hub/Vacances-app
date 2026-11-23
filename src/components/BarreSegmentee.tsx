import type { Postes } from '../engine/types'
import { formaterEuros, formaterPourcent } from '../lib/format'
import { POSTES } from '../lib/libelles'

/**
 * Fine barre segmentée (8 px, sans texte) : la répartition d'un total en postes.
 * La liste affichée à côté porte les noms et les montants ; la barre est donc masquée
 * aux lecteurs d'écran.
 */
export function BarreSegmentee({ postes, className = '' }: { postes: Postes; className?: string }) {
  const total = Object.values(postes).reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  return (
    <div aria-hidden="true" className={`flex h-2 gap-0.5 ${className}`}>
      {POSTES.filter((p) => postes[p.id] > 0).map((p) => (
        <div
          key={p.id}
          title={`${p.libelle} : ${formaterEuros(postes[p.id])} (${formaterPourcent(postes[p.id] / total)})`}
          className="rounded-full transition-[flex-grow] duration-500 motion-reduce:transition-none"
          style={{ flexGrow: postes[p.id], flexBasis: 0, backgroundColor: p.couleur }}
        />
      ))}
    </div>
  )
}
