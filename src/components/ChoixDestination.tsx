import { useId } from 'react'
import { destinations } from '../data'
import type { Confort, Zone } from '../data/types'
import { prixIndicatifParJour } from '../engine/indicatifs'
import { formaterEuros } from '../lib/format'

const ZONES: { id: Zone; titre: string }[] = [
  { id: 'france', titre: 'En France' },
  { id: 'europe', titre: 'En Europe' },
  { id: 'monde', titre: 'Plus loin' },
]

interface Props {
  valeur: string | null
  confort: Confort
  onChange: (id: string) => void
}

/** Grille de destinations (boutons radio) avec le prix indicatif par jour et par personne. */
export function ChoixDestination({ valeur, confort, onChange }: Props) {
  const nom = useId()
  return (
    <fieldset>
      <legend className="sr-only">Destination</legend>
      <p className="-mt-2 mb-3 text-sm text-slate-600 dark:text-slate-300">Prix indicatif sur place, par personne et par jour.</p>
      <div className="space-y-4">
        {ZONES.map((zone) => (
          <div key={zone.id}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300">{zone.titre}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {destinations
                .filter((d) => d.zone === zone.id)
                .map((d) => {
                  const choisie = d.id === valeur
                  return (
                    <label
                      key={d.id}
                      className={`relative flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl p-3 transition has-focus-visible:ring-2 has-focus-visible:ring-ocean-500 ${
                        choisie
                          ? 'bg-ocean-600 text-white shadow-lg shadow-ocean-600/30 dark:bg-ocean-500 dark:text-ocean-950'
                          : 'verre hover:-translate-y-0.5 hover:bg-white/85 dark:hover:bg-white/10'
                      }`}
                    >
                      <input type="radio" name={nom} value={d.id} checked={choisie} onChange={() => onChange(d.id)} className="sr-only" />
                      <span aria-hidden="true" className="text-3xl leading-none">
                        {d.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold leading-tight">{d.nom}</span>
                        <span className={`block text-xs ${choisie ? 'text-white/85 dark:text-ocean-950/80' : 'text-slate-600 dark:text-slate-300'}`}>
                          ≈ {formaterEuros(prixIndicatifParJour(d, confort))} / jour
                          <span className="sr-only"> par personne</span>
                        </span>
                      </span>
                    </label>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
