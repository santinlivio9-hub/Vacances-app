import { useId, type ReactNode } from 'react'

export interface OptionSegment<T extends string> {
  valeur: T
  libelle: ReactNode
  detail?: ReactNode
  desactive?: boolean
  /** Explication lue par les lecteurs d'écran et affichée au survol */
  titre?: string
}

interface Props<T extends string> {
  legende: string
  legendeVisible?: boolean
  options: OptionSegment<T>[]
  valeur: T
  onChange: (valeur: T) => void
  colonnes?: string
}

/** Boutons segmentés basés sur de vrais boutons radio : navigation aux flèches native. */
export function ChoixSegmente<T extends string>({ legende, legendeVisible = true, options, valeur, onChange, colonnes = 'grid-cols-3' }: Props<T>) {
  const nom = useId()
  return (
    <fieldset>
      <legend className={legendeVisible ? 'mb-2 text-sm font-medium text-slate-700 dark:text-slate-200' : 'sr-only'}>{legende}</legend>
      <div className={`grid gap-2 ${colonnes}`}>
        {options.map((option) => {
          const choisi = option.valeur === valeur
          return (
            <label
              key={option.valeur}
              title={option.titre}
              className={`relative flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition has-focus-visible:ring-2 has-focus-visible:ring-ocean-500 ${
                choisi
                  ? 'bg-ocean-600 text-white shadow-md shadow-ocean-600/30 dark:bg-ocean-500 dark:text-ocean-950'
                  : option.desactive
                    ? 'cursor-not-allowed text-slate-400 opacity-70 verre dark:text-slate-500'
                    : 'verre text-slate-800 hover:bg-white/85 dark:text-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <input
                type="radio"
                name={nom}
                value={option.valeur}
                checked={choisi}
                disabled={option.desactive}
                onChange={() => onChange(option.valeur)}
                className="sr-only"
              />
              <span className="text-sm font-semibold">{option.libelle}</span>
              {option.detail && (
                <span className={`text-xs ${choisi ? 'text-white/85 dark:text-ocean-950/80' : 'text-slate-600 dark:text-slate-300'}`}>
                  {option.detail}
                </span>
              )}
              {option.titre && option.desactive && <span className="sr-only"> — {option.titre}</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
