import { useState } from 'react'
import { BarreSegmentee } from '../components/BarreSegmentee'
import { DetailPostes } from '../components/DetailPostes'
import { Message } from '../components/Message'
import { TitrePage } from '../components/TitrePage'
import { trouverDestination } from '../data'
import { calculerVoyage, genererLiensReservation, type LienReservation, type PosteReservation } from '../engine'
import { ajouterJours } from '../engine/dates'
import { useMessage } from '../hooks/useMessage'
import { formaterDate, formaterEuros, pluriel } from '../lib/format'
import { libelleConfort, libelleMode, MENTION_ESTIMATION } from '../lib/libelles'
import { lien } from '../lib/routes'
import {
  aujourdhui,
  cleVoyage,
  decoderSimulation,
  encoderSimulation,
  nomSimulation,
  simulationParDefaut,
  versParametresVoyage,
} from '../lib/simulation'
import { ecrireChecklist, lireChecklist, sauvegarderSimulation } from '../lib/stockage'
import { boutonPrincipal, boutonSecondaire } from '../lib/styles'

const POSTES_RESERVATION: { id: PosteReservation; titre: string; icone: string }[] = [
  { id: 'transport', titre: 'Transport', icone: '🎫' },
  { id: 'logement', titre: 'Logement', icone: '🛏️' },
  { id: 'activites', titre: 'Activités', icone: '🎟️' },
]

function BoutonLien({ l }: { l: LienReservation }) {
  return (
    <a href={l.url} target="_blank" rel="noopener noreferrer" className={boutonSecondaire}>
      {l.site}
      <span className="text-xs font-normal text-slate-600 dark:text-slate-300">{l.prerempli ? '· pré-rempli' : '· à compléter'}</span>
      <span aria-hidden="true">↗</span>
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  )
}

export function Recap({ params }: { params: URLSearchParams }) {
  const sim = decoderSimulation(params, simulationParDefaut(aujourdhui()))
  const destination = sim.destinationId ? trouverDestination(sim.destinationId) : undefined
  const cle = cleVoyage(sim)
  const [coches, setCoches] = useState<string[]>(() => lireChecklist(cle))
  const { message, afficher } = useMessage()

  if (!destination) {
    return (
      <div className="verre mx-auto max-w-lg rounded-3xl p-6 text-center">
        <p aria-hidden="true" className="text-5xl">
          🧳
        </p>
        <h1 className="mt-3 text-xl font-semibold">Aucun voyage à récapituler</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Commencez par choisir une destination dans le simulateur.</p>
        <a href={lien('simulateur')} className={`${boutonPrincipal} mt-5`}>
          Ouvrir le simulateur
        </a>
      </div>
    )
  }

  const resultat = calculerVoyage(versParametresVoyage(sim, destination))
  const mode = resultat.transport?.mode ?? sim.mode
  const liens = genererLiensReservation(destination, {
    depart: sim.depart,
    personnes: sim.personnes,
    nuits: sim.nuits,
    mode,
    dateDepart: sim.dateDepart,
    chambres: resultat.chambres,
  })
  const montants: Record<PosteReservation, number> = {
    transport: resultat.postes.transport,
    logement: resultat.postes.logement,
    activites: resultat.postes.activites,
  }

  const checklist = [
    { id: 'transport', libelle: `${libelleMode(mode).libelle} : ${mode === 'voiture' ? 'itinéraire et véhicule prêts' : 'billets aller-retour réservés'}` },
    { id: 'logement', libelle: `Logement : ${pluriel(resultat.chambres, 'chambre')}, ${pluriel(sim.nuits, 'nuit')}` },
    ...sim.activites.map((i) => ({ id: `activite-${i}`, libelle: destination.activitesSuggerees[i].nom })),
    { id: 'papiers', libelle: destination.zone === 'monde' ? 'Passeport, visa ou autorisation d’entrée, assurance' : 'Pièce d’identité et assurance voyage' },
  ]
  const faits = checklist.filter((c) => coches.includes(c.id)).length

  function basculer(id: string) {
    const suivants = coches.includes(id) ? coches.filter((c) => c !== id) : [...coches, id]
    setCoches(suivants)
    if (!ecrireChecklist(cle, suivants)) afficher('Impossible de mémoriser la checklist : stockage du navigateur désactivé.')
  }

  function sauvegarder() {
    const ok = sauvegarderSimulation({ nom: nomSimulation(sim, destination!), parametres: encoderSimulation(sim).toString() })
    afficher(ok ? 'Simulation sauvegardée dans « Mes simulations »' : 'Sauvegarde impossible : le stockage du navigateur est désactivé.')
  }

  async function partager() {
    const url = window.location.href
    const titre = `Voyage à ${destination!.nom} : ${formaterEuros(resultat.total)}`
    try {
      if (navigator.share) {
        await navigator.share({ title: titre, text: `${titre} (estimation Budget Voyage)`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      afficher('Lien copié : collez-le pour partager ce voyage.')
    } catch (erreur) {
      if ((erreur as Error).name !== 'AbortError') afficher('Copie impossible : copiez l’adresse de la page à la main.')
    }
  }

  const retour = ajouterJours(sim.dateDepart, sim.nuits)
  const resume = [
    { terme: 'Dates', valeur: `du ${formaterDate(sim.dateDepart)} au ${formaterDate(retour)}` },
    { terme: 'Voyageurs', valeur: `${pluriel(sim.personnes, 'voyageur')} · ${pluriel(resultat.chambres, 'chambre')}` },
    { terme: 'Confort', valeur: libelleConfort(sim.confort) },
    { terme: 'Départ', valeur: `${sim.depart.nom} (${sim.depart.codePostal})` },
    { terme: 'Transport', valeur: `${libelleMode(mode).icone} ${libelleMode(mode).libelle}` },
  ]

  return (
    <>
      <TitrePage
        titre="Récapitulatif"
        sousTitre={`${destination.emoji} ${destination.nom}, ${destination.pays}`}
        actions={
          <>
            <a href={lien('simulateur', encoderSimulation(sim))} className={boutonSecondaire}>
              ← Modifier
            </a>
            <button type="button" onClick={sauvegarder} className={boutonSecondaire}>
              Sauvegarder
            </button>
            <button type="button" onClick={partager} className={boutonSecondaire}>
              Partager
            </button>
            <button type="button" onClick={() => window.print()} className={boutonPrincipal}>
              Imprimer / PDF
            </button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
        <div className="space-y-5">
          <section aria-labelledby="titre-voyage" className="verre rounded-3xl p-5 sm:p-6">
            <h2 id="titre-voyage" className="sr-only">
              Votre voyage
            </h2>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <p>
                <span className="block text-sm text-slate-600 dark:text-slate-300">Total estimé</span>
                <span className="block text-5xl font-bold tracking-tight tabular-nums">{formaterEuros(resultat.total)}</span>
                <span className="text-slate-700 dark:text-slate-200">soit {formaterEuros(resultat.parPersonne)} par personne</span>
              </p>
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {resume.map((r) => (
                <div key={r.terme}>
                  <dt className="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300">{r.terme}</dt>
                  <dd className="font-medium">{r.valeur}</dd>
                </div>
              ))}
            </dl>
            {resultat.avertissements.map((a) => (
              <p key={a} className="mt-4 rounded-2xl bg-ocean-600/10 px-4 py-3 text-sm dark:bg-ocean-300/10">
                <span aria-hidden="true">ℹ️ </span>
                {a}
              </p>
            ))}
          </section>

          <section aria-labelledby="titre-reserver" className="verre rounded-3xl p-5 sm:p-6">
            <h2 id="titre-reserver" className="text-lg font-semibold">
              Réserver poste par poste
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 print:hidden">
              Les liens s’ouvrent dans un nouvel onglet. « Pré-rempli » : dates et voyageurs déjà saisis ; vérifiez-les avant de payer.
            </p>
            <ul className="mt-4 space-y-4">
              {POSTES_RESERVATION.map((p) => (
                <li key={p.id} className="rounded-2xl bg-white/50 p-4 dark:bg-white/5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold">
                      <span aria-hidden="true">{p.icone} </span>
                      {p.titre}
                    </h3>
                    <span className="font-semibold tabular-nums">{formaterEuros(montants[p.id])}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                    {liens
                      .filter((l) => l.poste === p.id)
                      .map((l) => (
                        <BoutonLien key={l.site} l={l} />
                      ))}
                  </div>
                  <p className="mt-1 hidden text-sm print:block">
                    Sur : {liens.filter((l) => l.poste === p.id).map((l) => l.site).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-5">
          <section aria-labelledby="titre-checklist" className="verre rounded-3xl p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="titre-checklist" className="text-lg font-semibold">
                Checklist
              </h2>
              <span className="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
                {faits} / {checklist.length} fait{faits > 1 ? 's' : ''}
              </span>
            </div>
            <ul className="mt-3 space-y-1">
              {checklist.map((c) => (
                <li key={c.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 transition hover:bg-white/60 has-focus-visible:ring-2 has-focus-visible:ring-ocean-500 dark:hover:bg-white/5">
                    <input type="checkbox" checked={coches.includes(c.id)} onChange={() => basculer(c.id)} className="size-5 shrink-0 accent-ocean-600" />
                    <span className={`text-sm ${coches.includes(c.id) ? 'text-slate-500 line-through dark:text-slate-400' : ''}`}>{c.libelle}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="titre-detail" className="verre rounded-3xl p-5 sm:p-6">
            <h2 id="titre-detail" className="text-lg font-semibold">
              Détail du budget
            </h2>
            <BarreSegmentee postes={resultat.postes} className="mt-4" />
            <div className="mt-2">
              <DetailPostes
                resultat={resultat}
                personnes={sim.personnes}
                nuits={sim.nuits}
                tauxImprevus={sim.tauxImprevus}
                nombreActivites={sim.activites.length}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{MENTION_ESTIMATION}</p>
          </section>
        </div>
      </div>
      <Message message={message} />
    </>
  )
}
