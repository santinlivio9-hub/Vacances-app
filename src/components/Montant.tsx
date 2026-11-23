import { useValeurAnimee } from '../hooks/useValeurAnimee'
import { formaterEuros } from '../lib/format'

interface Props {
  valeur: number
  className?: string
}

/** Montant en euros qui glisse vers sa nouvelle valeur ; les lecteurs d'écran lisent la valeur finale. */
export function Montant({ valeur, className = '' }: Props) {
  const affichee = useValeurAnimee(valeur)
  return (
    <span className={`tabular-nums ${className}`}>
      <span aria-hidden="true">{formaterEuros(affichee)}</span>
      <span className="sr-only">{formaterEuros(valeur)}</span>
    </span>
  )
}
