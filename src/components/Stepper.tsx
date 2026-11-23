import { useId } from 'react'

interface Props {
  libelle: string
  valeur: number
  min: number
  max: number
  onChange: (valeur: number) => void
  /** Texte affiché pour la valeur, ex. 3 → « 3 voyageurs » */
  formater: (valeur: number) => string
}

const boutonRond =
  'grid size-11 shrink-0 place-items-center rounded-full text-xl font-semibold text-ocean-700 transition verre hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 disabled:opacity-40 dark:text-ocean-200 dark:hover:bg-white/10'

/** Compteur − / + avec de grandes cibles tactiles. */
export function Stepper({ libelle, valeur, min, max, onChange, formater }: Props) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        {libelle}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={boutonRond}
          disabled={valeur <= min}
          onClick={() => onChange(Math.max(min, valeur - 1))}
          aria-label={`${libelle} : moins`}
        >
          −
        </button>
        <output aria-live="polite" className="min-w-24 text-center text-lg font-semibold tabular-nums">
          {formater(valeur)}
        </output>
        <button
          type="button"
          className={boutonRond}
          disabled={valeur >= max}
          onClick={() => onChange(Math.min(max, valeur + 1))}
          aria-label={`${libelle} : plus`}
        >
          +
        </button>
      </div>
    </div>
  )
}
