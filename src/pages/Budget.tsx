import { useEffect, useId, useState } from 'react'
import { CarteCompatibilite } from '../components/CarteCompatibilite'
import { ChoixSegmente } from '../components/ChoixSegmente'
import { Jauge } from '../components/Jauge'
import { RechercheVille } from '../components/RechercheVille'
import { Section } from '../components/Section'
import { Stepper } from '../components/Stepper'
import { TitrePage } from '../components/TitrePage'
import { destinationsCompatibles, repartirBudget, type Compatibilite, type PosteBudget } from '../engine'
import { remplacerParametres } from '../hooks/useRoute'
import { formaterEuros, pluriel } from '../lib/format'
import { libelleConfort, MENTION_ESTIMATION, MODES, POSTES, STATUTS } from '../lib/libelles'
import { lien } from '../lib/routes'
import {
  aujourdhui,
  decoderBudget,
  encoderBudget,
  encoderSimulation,
  LIMITES,
  rechercheBudgetParDefaut,
  simulationParDefaut,
  type RechercheBudget,
} from '../lib/simulation'

const CURSEUR = { min: 300, max: 15_000, pas: 50 }

const ENVELOPPES: { id: PosteBudget; libelle: string }[] = [
  { id: 'transport', libelle: 'Transport' },
  { id: 'logement', libelle: 'Logement' },
  { id: 'repas', libelle: 'Repas' },
  { id: 'activites', libelle: 'Activités et sur place' },
  { id: 'imprevus', libelle: 'Imprévus' },
]
const couleurPoste = (id: PosteBudget) => POSTES.find((p) => p.id === id)!.couleur

/** Lien vers le simulateur pré-rempli avec le voyage de la carte. */
function lienDetail(c: Compatibilite, r: RechercheBudget): string {
  const sim = {
    ...simulationParDefaut(aujourdhui()),
    destinationId: c.destination.id,
    confort: c.confort,
    depart: r.depart,
    personnes: r.personnes,
    nuits: r.nuits,
    dateDepart: r.dateDepart,
    mode: c.resultat.transport?.mode ?? r.mode,
  }
  return lien('simulateur', encoderSimulation(sim))
}

export function Budget({ params }: { params: URLSearchParams }) {
  const idBudget = useId()
  const idDate = useId()
  const [recherche, setRecherche] = useState<RechercheBudget>(() => decoderBudget(params, rechercheBudgetParDefaut(aujourdhui())))
  const [saisieBudget, setSaisieBudget] = useState(String(recherche.budget))

  useEffect(() => remplacerParametres('budget', encoderBudget(recherche)), [recherche])

  const modifier = (partiel: Partial<RechercheBudget>) => setRecherche((r) => ({ ...r, ...partiel }))

  function changerBudget(texte: string) {
    setSaisieBudget(texte)
    const n = Number(texte)
    if (Number.isFinite(n) && n >= LIMITES.budget.min && n <= LIMITES.budget.max) modifier({ budget: Math.round(n) })
  }

  const { budget, depart, personnes, nuits, mode, dateDepart } = recherche
  const criteres = { depart, personnes, nuits, mode, dateDepart }
  const liste = destinationsCompatibles(budget, criteres)
  const quiPassent = liste.filter((c) => c.statut !== 'depasse').length
  const meilleure = liste[0]
  const repartition = repartirBudget(budget, { ...criteres, destination: meilleure.destination, confort: meilleure.confort })
  const budgetInvalide = Number(saisieBudget) !== budget

  return (
    <>
      <TitrePage titre="J’ai un budget, où partir ?" sousTitre="Pour chaque destination : le meilleur confort qui rentre dans votre budget." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5 lg:sticky lg:top-24">
          <Section titre="Votre budget total">
            <label htmlFor={idBudget} className="sr-only">
              Budget total en euros
            </label>
            <div className="relative">
              <input
                id={idBudget}
                type="number"
                inputMode="numeric"
                min={LIMITES.budget.min}
                max={LIMITES.budget.max}
                step={50}
                value={saisieBudget}
                onChange={(e) => changerBudget(e.target.value)}
                onBlur={() => setSaisieBudget(String(budget))}
                aria-invalid={budgetInvalide}
                aria-describedby={`${idBudget}-aide`}
                className="champ h-14 pr-10 text-2xl font-bold tabular-nums"
              />
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xl font-semibold text-slate-500">
                €
              </span>
            </div>
            <p id={`${idBudget}-aide`} className={`mt-2 text-xs ${budgetInvalide ? 'text-(--statut-depasse-texte)' : 'text-slate-600 dark:text-slate-300'}`}>
              {budgetInvalide
                ? `Entrez un montant entre ${formaterEuros(LIMITES.budget.min)} et ${formaterEuros(LIMITES.budget.max)}.`
                : 'Pour tout le groupe, transport compris.'}
            </p>
            <input
              type="range"
              aria-label="Budget total (curseur)"
              min={CURSEUR.min}
              max={CURSEUR.max}
              step={CURSEUR.pas}
              value={Math.min(CURSEUR.max, Math.max(CURSEUR.min, budget))}
              onChange={(e) => {
                modifier({ budget: Number(e.target.value) })
                setSaisieBudget(e.target.value)
              }}
              className="mt-3 h-11 w-full cursor-pointer accent-ocean-600"
            />
          </Section>

          <Section titre="Le voyage">
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <Stepper
                  libelle="Voyageurs"
                  valeur={personnes}
                  min={LIMITES.personnes.min}
                  max={LIMITES.personnes.max}
                  onChange={(p) => modifier({ personnes: p })}
                  formater={(n) => pluriel(n, 'voyageur')}
                />
                <Stepper
                  libelle="Durée"
                  valeur={nuits}
                  min={LIMITES.nuits.min}
                  max={LIMITES.nuits.max}
                  onChange={(n) => modifier({ nuits: n })}
                  formater={(n) => pluriel(n, 'nuit')}
                />
              </div>
              <div>
                <label htmlFor={idDate} className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Date de départ
                </label>
                <input
                  id={idDate}
                  type="date"
                  required
                  min={aujourdhui()}
                  value={dateDepart}
                  onChange={(e) => e.target.value && modifier({ dateDepart: e.target.value })}
                  className="champ"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Ville de départ</p>
                <RechercheVille valeur={depart} onChange={(d) => modifier({ depart: d })} />
              </div>
              <ChoixSegmente
                legende="Transport préféré"
                valeur={mode}
                onChange={(m) => modifier({ mode: m })}
                options={MODES.map((m) => ({
                  valeur: m.id,
                  libelle: (
                    <>
                      <span aria-hidden="true">{m.icone}</span> {m.libelle}
                    </>
                  ),
                }))}
              />
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <section aria-labelledby="titre-synthese" className="verre rounded-3xl p-5 sm:p-6">
            <h2 id="titre-synthese" className="text-lg font-semibold" aria-live="polite">
              {quiPassent === 0
                ? 'Aucune destination ne rentre dans ce budget'
                : `${quiPassent} destination${quiPassent > 1 ? 's' : ''} sur ${liste.length} rentre${quiPassent > 1 ? 'nt' : ''} dans votre budget`}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {quiPassent === 0 ? 'Plus proche de votre budget : ' : 'Meilleure option : '}
              <strong>
                {meilleure.destination.emoji} {meilleure.destination.nom}
              </strong>{' '}
              en {libelleConfort(meilleure.confort).toLowerCase()}
            </p>

            <div className="mt-4">
              <Jauge
                utilise={meilleure.resultat.total}
                budget={budget}
                couleur={STATUTS[meilleure.statut].couleur}
                libelle="Budget utilisé par la meilleure option"
                epaisse
              />
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  <strong className="tabular-nums">{formaterEuros(meilleure.resultat.total)}</strong> utilisés
                </span>
                <span className={STATUTS[meilleure.statut].classeTexte}>
                  <span aria-hidden="true">{STATUTS[meilleure.statut].icone} </span>
                  {meilleure.marge >= 0
                    ? `${formaterEuros(meilleure.marge)} restants`
                    : `${formaterEuros(-meilleure.marge)} de dépassement`}
                </span>
              </div>
            </div>

            <h3 className="mt-5 text-sm font-semibold">Comment répartir {formaterEuros(budget)} pour ce voyage</h3>
            {!repartition.suffisant && (
              <p className="mt-1 text-sm text-(--statut-depasse-texte)">Le transport seul dépasse le budget disponible.</p>
            )}
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ENVELOPPES.map((e) => (
                <li key={e.id} className="rounded-2xl bg-white/50 p-3 dark:bg-white/5">
                  <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: couleurPoste(e.id) }} />
                    {e.libelle}
                  </span>
                  <span className="mt-1 block font-semibold tabular-nums">{formaterEuros(repartition.enveloppes[e.id])}</span>
                </li>
              ))}
            </ul>
          </section>

          <ul className="grid gap-4 sm:grid-cols-2" aria-label="Destinations, de la plus adaptée à la moins adaptée">
            {liste.map((c) => (
              <li key={c.destination.id} className="flex">
                <div className="w-full">
                  <CarteCompatibilite compatibilite={c} budget={budget} lienDetail={lienDetail(c, recherche)} />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {MENTION_ESTIMATION}. « Ça passe » : au moins 10 % de marge ; « C’est juste » : moins de 10 %.
          </p>
        </div>
      </div>
    </>
  )
}
