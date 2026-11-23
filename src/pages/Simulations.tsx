import { lazy, Suspense, useState } from 'react'
import { TitrePage } from '../components/TitrePage'
import { trouverDestination } from '../data'
import type { Destination } from '../data/types'
import { calculerVoyage } from '../engine'
import type { ResultatVoyage } from '../engine/types'
import { formaterDateCourte, formaterEuros, pluriel } from '../lib/format'
import { libelleConfort, libelleMode, POSTES } from '../lib/libelles'
import { lien } from '../lib/routes'
import { aujourdhui, decoderSimulation, encoderSimulation, simulationParDefaut, versParametresVoyage, type Simulation } from '../lib/simulation'
import { lireSimulations, stockageNavigateur, supprimerSimulation, type SimulationSauvegardee } from '../lib/stockage'
import { boutonDiscret, boutonPrincipal, boutonSecondaire } from '../lib/styles'

const GraphiqueComparaison = lazy(() => import('../components/GraphiqueComparaison'))

const MAX_COMPARAISON = 3

interface Entree {
  sauvegarde: SimulationSauvegardee
  sim: Simulation
  destination: Destination
  resultat: ResultatVoyage
}

function preparer(liste: SimulationSauvegardee[]): Entree[] {
  const defaut = simulationParDefaut(aujourdhui())
  return liste.flatMap((sauvegarde) => {
    const sim = decoderSimulation(new URLSearchParams(sauvegarde.parametres), defaut)
    const destination = sim.destinationId ? trouverDestination(sim.destinationId) : undefined
    if (!destination) return []
    return [{ sauvegarde, sim, destination, resultat: calculerVoyage(versParametresVoyage(sim, destination)) }]
  })
}

export function Simulations() {
  const [liste, setListe] = useState(() => lireSimulations())
  const [selection, setSelection] = useState<string[]>([])
  const [aConfirmer, setAConfirmer] = useState<string | null>(null)
  const stockageDispo = stockageNavigateur() !== null

  const entrees = preparer(liste)
  const comparees = entrees.filter((e) => selection.includes(e.sauvegarde.id))
  const moinsChere = comparees.length > 1 ? Math.min(...comparees.map((e) => e.resultat.total)) : null

  function basculerSelection(id: string) {
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_COMPARAISON ? [...s, id] : s))
  }

  function supprimer(id: string) {
    supprimerSimulation(id)
    setListe(lireSimulations())
    setSelection((s) => s.filter((x) => x !== id))
    setAConfirmer(null)
  }

  if (entrees.length === 0) {
    return (
      <>
        <TitrePage titre="Mes simulations" />
        <div className="verre mx-auto max-w-lg rounded-3xl p-6 text-center">
          <p aria-hidden="true" className="text-5xl">
            ⭐
          </p>
          <h2 className="mt-3 text-xl font-semibold">Aucune simulation sauvegardée</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {stockageDispo
              ? 'Dans le simulateur, touchez « Sauvegarder » pour retrouver un voyage ici et le comparer à d’autres.'
              : 'Le stockage de ce navigateur est désactivé (navigation privée ?) : les simulations ne peuvent pas être gardées.'}
          </p>
          <a href={lien('simulateur')} className={`${boutonPrincipal} mt-5`}>
            Faire une simulation
          </a>
        </div>
      </>
    )
  }

  return (
    <>
      <TitrePage titre="Mes simulations" sousTitre={`Cochez 2 ou 3 voyages pour les comparer côte à côte.`} />

      <ul className="grid gap-3 md:grid-cols-2">
        {entrees.map(({ sauvegarde, sim, destination, resultat }) => {
          const choisie = selection.includes(sauvegarde.id)
          const pleine = !choisie && selection.length >= MAX_COMPARAISON
          return (
            <li key={sauvegarde.id} className={`verre flex flex-col gap-3 rounded-3xl p-5 ${choisie ? 'ring-2 ring-ocean-500' : ''}`}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="text-3xl leading-none">
                  {destination.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold leading-tight">{sauvegarde.nom}</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Départ de {sim.depart.nom} le {formaterDateCourte(sim.dateDepart)} · sauvegardée le{' '}
                    {formaterDateCourte(sauvegarde.creeLe.slice(0, 10))}
                  </p>
                </div>
                <p className="text-right">
                  <span className="block text-lg font-bold tabular-nums">{formaterEuros(resultat.total)}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">{formaterEuros(resultat.parPersonne)} / pers.</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium ${pleine ? 'opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={choisie}
                    disabled={pleine}
                    onChange={() => basculerSelection(sauvegarde.id)}
                    className="size-5 accent-ocean-600"
                  />
                  Comparer
                </label>
                <a href={lien('simulateur', encoderSimulation(sim))} className={boutonSecondaire}>
                  Ouvrir
                </a>
                <a href={lien('recap', encoderSimulation(sim))} className={boutonSecondaire}>
                  Récap
                </a>
                {aConfirmer === sauvegarde.id ? (
                  <button type="button" onClick={() => supprimer(sauvegarde.id)} className={`${boutonDiscret} text-(--statut-depasse-texte)`}>
                    Confirmer la suppression
                  </button>
                ) : (
                  <button type="button" onClick={() => setAConfirmer(sauvegarde.id)} className={boutonDiscret}>
                    Supprimer <span className="sr-only">{sauvegarde.nom}</span>
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {comparees.length >= 2 ? (
        <section aria-labelledby="titre-comparaison" className="verre mt-6 rounded-3xl p-5 sm:p-6">
          <h2 id="titre-comparaison" className="text-lg font-semibold">
            Comparaison
          </h2>
          <div className="mt-4">
            <Suspense fallback={<p className="text-sm text-slate-600 dark:text-slate-300">Chargement du graphique…</p>}>
              <GraphiqueComparaison lignes={comparees.map((e) => ({ nom: e.destination.nom, postes: e.resultat.postes }))} />
            </Suspense>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <caption className="sr-only">Comparaison détaillée des voyages sélectionnés</caption>
              <thead>
                <tr className="border-b border-slate-900/10 dark:border-white/10">
                  <th scope="col" className="py-2 pr-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    <span className="sr-only">Critère</span>
                  </th>
                  {comparees.map((e) => (
                    <th key={e.sauvegarde.id} scope="col" className="px-3 py-2 text-right font-semibold">
                      <span aria-hidden="true">{e.destination.emoji} </span>
                      {e.destination.nom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/10 dark:divide-white/10">
                {[
                  { libelle: 'Départ', valeur: (e: Entree) => e.sim.depart.nom },
                  { libelle: 'Date', valeur: (e: Entree) => formaterDateCourte(e.sim.dateDepart) },
                  { libelle: 'Voyageurs', valeur: (e: Entree) => pluriel(e.sim.personnes, 'pers.', 'pers.') },
                  { libelle: 'Nuits', valeur: (e: Entree) => String(e.sim.nuits) },
                  { libelle: 'Confort', valeur: (e: Entree) => libelleConfort(e.sim.confort) },
                  { libelle: 'Moyen de transport', valeur: (e: Entree) => (e.resultat.transport ? libelleMode(e.resultat.transport.mode).libelle : '—') },
                  ...POSTES.map((p) => ({
                    libelle: p.libelle,
                    couleur: p.couleur,
                    valeur: (e: Entree) => formaterEuros(e.resultat.postes[p.id]),
                  })),
                ].map((ligne) => (
                  <tr key={ligne.libelle}>
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-2">
                        {'couleur' in ligne && <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: ligne.couleur }} />}
                        {ligne.libelle}
                      </span>
                    </th>
                    {comparees.map((e) => (
                      <td key={e.sauvegarde.id} className="px-3 py-2 text-right tabular-nums">
                        {ligne.valeur(e)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="font-semibold">
                  <th scope="row" className="py-3 pr-3 text-left">
                    Total
                  </th>
                  {comparees.map((e) => (
                    <td key={e.sauvegarde.id} className="px-3 py-3 text-right tabular-nums">
                      {formaterEuros(e.resultat.total)}
                      {e.resultat.total === moinsChere && (
                        <span className="mt-1 block text-xs font-semibold text-(--statut-ok-texte)">
                          <span aria-hidden="true">✓ </span>Le moins cher
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-slate-600 dark:text-slate-300">
                    Par personne
                  </th>
                  {comparees.map((e) => (
                    <td key={e.sauvegarde.id} className="px-3 py-2 text-right tabular-nums">
                      {formaterEuros(e.resultat.parPersonne)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
          {comparees.length === 1 ? 'Cochez au moins un autre voyage pour lancer la comparaison.' : `Jusqu’à ${MAX_COMPARAISON} voyages comparables à la fois.`}
        </p>
      )}
    </>
  )
}
