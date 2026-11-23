import type { Destination } from '../data/types'
import { prixIndicatifParJour } from '../engine/indicatifs'
import type { OptionTransport, ResultatVoyage } from '../engine/types'
import { formaterEuros, formaterKm, formaterMois } from '../lib/format'
import { MODES } from '../lib/libelles'

interface Props {
  destination: Destination
  distanceKm?: number
  /** Coût de chaque mode de transport (aller-retour, groupe) */
  options?: OptionTransport[]
  /** Voyage type calculé par le moteur */
  resultat?: ResultatVoyage
  legende?: string
}

export function CarteDestination({ destination, distanceKm, options, resultat, legende }: Props) {
  return (
    <article className="verre flex flex-col gap-3 rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-4xl leading-none">
          {destination.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-tight">{destination.nom}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {destination.pays}
            {distanceKm !== undefined && <> · à {formaterKm(distanceKm)}</>}
          </p>
        </div>
        <p className="text-right">
          <span className="block text-lg font-bold text-ocean-700 dark:text-ocean-300">
            {formaterEuros(prixIndicatifParJour(destination))}
          </span>
          <span className="block text-xs text-slate-600 dark:text-slate-300">/ jour / pers.</span>
        </p>
      </div>

      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{destination.description}</p>

      {options && (
        <ul aria-label="Transport aller-retour" className="flex flex-wrap gap-2 text-xs">
          {MODES.map((mode) => {
            const option = options.find((o) => o.mode === mode.id)
            const possible = option?.disponible ?? false
            const retenu = resultat?.transport?.mode === mode.id
            return (
              <li
                key={mode.id}
                title={option?.raison}
                className={`rounded-full px-2.5 py-1 font-medium ${
                  retenu
                    ? 'bg-ocean-600 text-white'
                    : possible
                      ? 'bg-ocean-600/10 text-ocean-800 dark:bg-ocean-300/15 dark:text-ocean-100'
                      : 'text-slate-500 line-through dark:text-slate-400'
                }`}
              >
                <span aria-hidden="true">{mode.icone}</span> {mode.libelle}
                {possible && option ? ` ${formaterEuros(option.cout)}` : <span className="sr-only"> : {option?.raison}</span>}
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-t border-slate-900/10 pt-3 dark:border-white/10">
        {resultat ? (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {legende}
            <strong className="block text-xl text-slate-900 dark:text-white">{formaterEuros(resultat.total)}</strong>
          </p>
        ) : (
          <span />
        )}
        <span className="text-xs text-slate-600 dark:text-slate-300">Haute saison : {formaterMois(destination.moisHauteSaison)}</span>
      </div>
    </article>
  )
}
