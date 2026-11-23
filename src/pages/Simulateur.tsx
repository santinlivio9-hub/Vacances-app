import { useEffect, useId, useState } from 'react'
import { BarreTotalMobile } from '../components/BarreTotalMobile'
import { ChoixDestination } from '../components/ChoixDestination'
import { ChoixSegmente } from '../components/ChoixSegmente'
import { ChoixTransport } from '../components/ChoixTransport'
import { Message } from '../components/Message'
import { OptionsAvancees } from '../components/OptionsAvancees'
import { PanneauResultat } from '../components/PanneauResultat'
import { RechercheVille } from '../components/RechercheVille'
import { Section } from '../components/Section'
import { Stepper } from '../components/Stepper'
import { TitrePage } from '../components/TitrePage'
import { trouverDestination } from '../data'
import { calculerVoyage, CONTEXTE_PAR_DEFAUT, optionsTransport, saisonDuVoyage } from '../engine'
import { ajouterJours } from '../engine/dates'
import { remplacerParametres } from '../hooks/useRoute'
import { useMessage } from '../hooks/useMessage'
import { formaterDate, pluriel } from '../lib/format'
import { CONFORTS } from '../lib/libelles'
import { lien } from '../lib/routes'
import {
  aujourdhui,
  decoderSimulation,
  encoderSimulation,
  LIMITES,
  nomSimulation,
  simulationParDefaut,
  versParametresVoyage,
  type Simulation,
} from '../lib/simulation'
import { sauvegarderSimulation } from '../lib/stockage'
import { boutonPrincipal, boutonSecondaire } from '../lib/styles'

export function Simulateur({ params }: { params: URLSearchParams }) {
  const idDate = useId()
  const [sim, setSim] = useState<Simulation>(() => decoderSimulation(params, simulationParDefaut(aujourdhui())))
  const { message, afficher } = useMessage()

  useEffect(() => remplacerParametres('simulateur', encoderSimulation(sim)), [sim])

  function modifier(partiel: Partial<Simulation>) {
    setSim((actuelle) => {
      const suivante = { ...actuelle, ...partiel }
      // les activités cochées dépendent de la destination
      if (partiel.destinationId !== undefined && partiel.destinationId !== actuelle.destinationId) suivante.activites = []
      if (suivante.chambres !== null && suivante.chambres > suivante.personnes) suivante.chambres = suivante.personnes
      return suivante
    })
  }

  const basculerActivite = (i: number) =>
    modifier({ activites: sim.activites.includes(i) ? sim.activites.filter((a) => a !== i) : [...sim.activites, i].sort((a, b) => a - b) })

  const destination = sim.destinationId ? (trouverDestination(sim.destinationId) ?? null) : null
  const resultat = destination ? calculerVoyage(versParametresVoyage(sim, destination)) : null
  const options = destination && resultat ? optionsTransport(sim.depart, destination, sim.personnes, resultat.saison, CONTEXTE_PAR_DEFAUT) : null
  const saisonDeduite = destination ? saisonDuVoyage(destination, sim.dateDepart) : 'moyenne'

  function sauvegarder() {
    if (!destination) return
    const ok = sauvegarderSimulation({ nom: nomSimulation(sim, destination), parametres: encoderSimulation(sim).toString() })
    afficher(ok ? 'Simulation sauvegardée dans « Mes simulations »' : 'Sauvegarde impossible : le stockage du navigateur est désactivé.')
  }

  return (
    <>
      <TitrePage titre="Combien va coûter mon voyage ?" sousTitre="Choisissez une destination : le total se met à jour en direct." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-start">
        <div className="space-y-5">
          <Section titre="1. La destination">
            <ChoixDestination valeur={sim.destinationId} confort={sim.confort} onChange={(destinationId) => modifier({ destinationId })} />
          </Section>

          <Section titre="2. Voyageurs et dates">
            <div className="grid gap-5 sm:grid-cols-2">
              <Stepper
                libelle="Voyageurs"
                valeur={sim.personnes}
                min={LIMITES.personnes.min}
                max={LIMITES.personnes.max}
                onChange={(personnes) => modifier({ personnes })}
                formater={(n) => pluriel(n, 'voyageur')}
              />
              <Stepper
                libelle="Durée"
                valeur={sim.nuits}
                min={LIMITES.nuits.min}
                max={LIMITES.nuits.max}
                onChange={(nuits) => modifier({ nuits })}
                formater={(n) => pluriel(n, 'nuit')}
              />
              <div className="sm:col-span-2">
                <label htmlFor={idDate} className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Date de départ
                </label>
                <input
                  id={idDate}
                  type="date"
                  required
                  value={sim.dateDepart}
                  min={aujourdhui()}
                  onChange={(e) => e.target.value && modifier({ dateDepart: e.target.value })}
                  className="champ sm:max-w-xs"
                />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Retour le {formaterDate(ajouterJours(sim.dateDepart, sim.nuits))}
                  {destination && <> · {saisonDeduite} saison à {destination.nom}</>}
                </p>
              </div>
            </div>
          </Section>

          <Section titre="3. Le confort">
            <ChoixSegmente
              legende="Niveau de confort"
              legendeVisible={false}
              valeur={sim.confort}
              onChange={(confort) => modifier({ confort })}
              options={CONFORTS.map((c) => ({ valeur: c.id, libelle: c.libelle, detail: c.detail }))}
            />
          </Section>

          <Section titre="4. Départ et transport">
            <div className="space-y-5">
              <RechercheVille valeur={sim.depart} onChange={(depart) => modifier({ depart })} />
              <ChoixTransport options={options} mode={sim.mode} retenu={resultat?.transport?.mode ?? null} onChange={(mode) => modifier({ mode })} />
            </div>
          </Section>

          <OptionsAvancees sim={sim} saisonDeduite={saisonDeduite} onChange={modifier} />
        </div>

        <aside id="resultat" aria-label="Résultat" className="scroll-mt-24 lg:sticky lg:top-24">
          {destination && resultat ? (
            <PanneauResultat
              destination={destination}
              sim={sim}
              resultat={resultat}
              onBasculerActivite={basculerActivite}
              actions={
                <>
                  <a href={lien('recap', encoderSimulation(sim))} className={boutonPrincipal}>
                    Récap et réservation <span aria-hidden="true">→</span>
                  </a>
                  <button type="button" onClick={sauvegarder} className={boutonSecondaire}>
                    Sauvegarder
                  </button>
                </>
              }
            />
          ) : (
            <div className="verre rounded-3xl p-6 text-center">
              <p aria-hidden="true" className="text-5xl">
                🗺️
              </p>
              <p className="mt-3 text-lg font-semibold">Choisissez une destination</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Le coût total et son détail apparaîtront ici, en direct.</p>
            </div>
          )}
        </aside>
      </div>

      {resultat && <BarreTotalMobile total={resultat.total} parPersonne={resultat.parPersonne} cibleId="resultat" />}
      <Message message={message} />
    </>
  )
}
