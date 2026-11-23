import type { ReactNode } from 'react'
import type { Destination } from '../data/types'
import type { ResultatVoyage } from '../engine/types'
import { formaterEuros, pluriel } from '../lib/format'
import { libelleConfort, MENTION_ESTIMATION, SAISONS } from '../lib/libelles'
import type { Simulation } from '../lib/simulation'
import { BarreSegmentee } from './BarreSegmentee'
import { DetailPostes } from './DetailPostes'
import { Montant } from './Montant'

interface Props {
  destination: Destination
  sim: Simulation
  resultat: ResultatVoyage
  onBasculerActivite: (index: number) => void
  actions: ReactNode
}

export function PanneauResultat({ destination, sim, resultat, onBasculerActivite, actions }: Props) {
  const saison = SAISONS.find((s) => s.id === resultat.saison)!.libelle.toLowerCase()

  return (
    <div className="verre rounded-3xl p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
        <span aria-hidden="true" className="text-2xl">
          {destination.emoji}
        </span>
        {destination.nom} · total estimé
      </p>
      <p aria-live="polite" aria-atomic="true">
        <Montant valeur={resultat.total} className="block text-5xl font-bold tracking-tight text-slate-950 dark:text-white" />
        <span className="mt-1 block text-slate-700 dark:text-slate-200">
          soit <strong className="tabular-nums">{formaterEuros(resultat.parPersonne)}</strong> par personne
        </span>
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {pluriel(sim.personnes, 'voyageur')} · {pluriel(sim.nuits, 'nuit')} · {libelleConfort(sim.confort)} · {saison} saison
      </p>

      <BarreSegmentee postes={resultat.postes} className="mt-5" />
      <div className="mt-2">
        <DetailPostes
          resultat={resultat}
          personnes={sim.personnes}
          nuits={sim.nuits}
          tauxImprevus={sim.tauxImprevus}
          nombreActivites={sim.activites.length}
        />
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Activités à ajouter</legend>
        <p className="text-xs text-slate-600 dark:text-slate-300">Prix par personne, multiplié par {pluriel(sim.personnes, 'voyageur')}.</p>
        <ul className="mt-2 space-y-1">
          {destination.activitesSuggerees.map((a, i) => {
            const cochee = sim.activites.includes(i)
            return (
              <li key={a.nom}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 transition hover:bg-white/60 has-focus-visible:ring-2 has-focus-visible:ring-ocean-500 dark:hover:bg-white/5">
                  <input type="checkbox" checked={cochee} onChange={() => onBasculerActivite(i)} className="size-5 shrink-0 accent-ocean-600" />
                  <span className="flex-1 text-sm">{a.nom}</span>
                  <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
                    {a.prixIndicatif === 0 ? 'Gratuit' : formaterEuros(a.prixIndicatif)}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <div className="mt-6 flex flex-wrap gap-2">{actions}</div>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{MENTION_ESTIMATION}</p>
    </div>
  )
}
