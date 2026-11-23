import { useId } from 'react'
import type { Saison } from '../data/types'
import { chambresNecessaires } from '../engine/calculerVoyage'
import { formaterPourcent, pluriel } from '../lib/format'
import { SAISONS } from '../lib/libelles'
import { LIMITES, type Simulation } from '../lib/simulation'
import { boutonDiscret } from '../lib/styles'
import { ChoixSegmente } from './ChoixSegmente'
import { Stepper } from './Stepper'

interface Props {
  sim: Simulation
  saisonDeduite: Saison
  onChange: (partiel: Partial<Simulation>) => void
}

const libelleSaison = (s: Saison) => SAISONS.find((x) => x.id === s)!.libelle.toLowerCase()

/** Réglages fins, repliés par défaut pour garder le formulaire simple. */
export function OptionsAvancees({ sim, saisonDeduite, onChange }: Props) {
  const idImprevus = useId()
  const chambresParDefaut = chambresNecessaires(sim.personnes)
  const modifiees = sim.saison !== null || sim.tauxImprevus !== 0.1 || sim.chambres !== null

  return (
    <details className="verre group rounded-3xl" open={modifiees || undefined}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span>
          Plus d’options
          <span className="block text-sm font-normal text-slate-600 dark:text-slate-300">Saison, imprévus, nombre de chambres</span>
        </span>
        <span aria-hidden="true" className="text-xl transition group-open:rotate-180">
          ⌄
        </span>
      </summary>

      <div className="space-y-6 px-5 pb-6 sm:px-6">
        <ChoixSegmente<Saison | 'auto'>
          legende="Saison"
          colonnes="grid-cols-2 sm:grid-cols-4"
          valeur={sim.saison ?? 'auto'}
          onChange={(v) => onChange({ saison: v === 'auto' ? null : v })}
          options={[
            { valeur: 'auto', libelle: 'Automatique', detail: `selon la date : ${libelleSaison(saisonDeduite)}` },
            ...SAISONS.map((s) => ({ valeur: s.id, libelle: s.libelle })),
          ]}
        />

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor={idImprevus} className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Marge pour les imprévus
            </label>
            <output htmlFor={idImprevus} className="font-semibold tabular-nums">
              {formaterPourcent(sim.tauxImprevus)}
            </output>
          </div>
          <input
            id={idImprevus}
            type="range"
            min={LIMITES.imprevusPct.min}
            max={LIMITES.imprevusPct.max}
            step={1}
            value={Math.round(sim.tauxImprevus * 100)}
            onChange={(e) => onChange({ tauxImprevus: Number(e.target.value) / 100 })}
            className="h-11 w-full cursor-pointer accent-ocean-600"
          />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <Stepper
            libelle="Chambres"
            valeur={sim.chambres ?? chambresParDefaut}
            min={1}
            max={sim.personnes}
            onChange={(chambres) => onChange({ chambres })}
            formater={(n) => pluriel(n, 'chambre')}
          />
          {sim.chambres !== null && (
            <button type="button" className={boutonDiscret} onClick={() => onChange({ chambres: null })}>
              Revenir à 1 chambre pour 2
            </button>
          )}
        </div>
      </div>
    </details>
  )
}
