import type { Destination } from '../data/types'
import { prixIndicatifParJour } from '../engine/indicatifs'
import { formaterEuros, formaterKm, formaterMois } from '../lib/format'
import { MODES } from '../lib/libelles'

interface Props {
  destination: Destination
  distanceKm?: number
}

export function CarteDestination({ destination, distanceKm }: Props) {
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

      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
        {MODES.map((mode) => {
          const possible = destination.modesDisponibles.includes(mode.id)
          return (
            <span
              key={mode.id}
              className={`rounded-full px-2.5 py-1 font-medium ${
                possible
                  ? 'bg-ocean-600/10 text-ocean-800 dark:bg-ocean-300/15 dark:text-ocean-100'
                  : 'text-slate-500 line-through dark:text-slate-400'
              }`}
            >
              <span aria-hidden="true">{mode.icone}</span> {mode.libelle}
              {!possible && <span className="sr-only"> (indisponible)</span>}
            </span>
          )
        })}
        <span className="ml-auto text-slate-600 dark:text-slate-300">Haute saison : {formaterMois(destination.moisHauteSaison)}</span>
      </div>
    </article>
  )
}
