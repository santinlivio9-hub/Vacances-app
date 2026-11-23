import { useState } from 'react'
import { CarteDestination } from './components/CarteDestination'
import { Fond } from './components/Fond'
import { RechercheVille } from './components/RechercheVille'
import { aeroports, destinations, villesDepart } from './data'
import type { LieuDepart, Zone } from './data/types'
import { aeroportLePlusProche, distanceKm } from './engine/geo'
import { formaterKm } from './lib/format'
import { MENTION_ESTIMATION } from './lib/libelles'

const ZONES: { id: Zone; titre: string }[] = [
  { id: 'france', titre: 'En France' },
  { id: 'europe', titre: 'En Europe' },
  { id: 'monde', titre: 'Plus loin' },
]

/** Page provisoire (phase 1) : aperçu des données et du style visuel. */
export default function App() {
  const [depart, setDepart] = useState<LieuDepart>(villesDepart[0])
  const proche = aeroportLePlusProche(depart, aeroports)

  return (
    <>
      <Fond />
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <span aria-hidden="true">🧳</span> Budget Voyage
          </h1>
          <span className="verre rounded-full px-3 py-1.5 text-sm font-medium text-ocean-800 dark:text-ocean-100">
            Aperçu · phase 1 sur 4
          </span>
        </header>

        <main className="space-y-10">
          <section aria-labelledby="titre-depart" className="verre rounded-3xl p-5 sm:p-6">
            <h2 id="titre-depart" className="text-lg font-semibold">
              D'où partez-vous ?
            </h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Toutes les communes de France métropolitaine et de Corse sont disponibles.
            </p>
            <RechercheVille valeur={depart} onChange={setDepart} />
            <p className="mt-4 text-sm text-slate-700 dark:text-slate-200" aria-live="polite">
              Départ de <strong>{depart.nom}</strong> ({depart.codePostal}) · aéroport le plus proche :{' '}
              <strong>{proche.aeroport.nom}</strong>
              {proche.distanceKm >= 10 && <>, à {formaterKm(proche.distanceKm)}</>}
            </p>
          </section>

          {ZONES.map((zone) => (
            <section key={zone.id} aria-labelledby={`titre-${zone.id}`}>
              <h2 id={`titre-${zone.id}`} className="mb-4 text-xl font-semibold">
                {zone.titre}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {destinations
                  .filter((d) => d.zone === zone.id)
                  .map((d) => (
                    <CarteDestination key={d.id} destination={d} distanceKm={distanceKm(depart, d)} />
                  ))}
              </div>
            </section>
          ))}
        </main>

        <footer className="mt-12 text-center text-xs text-slate-600 dark:text-slate-400">
          <p>{MENTION_ESTIMATION}. Prix sur place par personne, en moyenne saison, confort moyen, chambre double partagée.</p>
        </footer>
      </div>
    </>
  )
}
