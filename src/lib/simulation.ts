import { trouverDestination, villesDepart } from '../data'
import type { Confort, Destination, LieuDepart, ModeTransport, Saison } from '../data/types'
import { ajouterJours, lireDate } from '../engine/dates'
import type { ParametresVoyage } from '../engine/types'

/** État de l'interface du simulateur (sérialisable dans l'URL). */
export interface Simulation {
  destinationId: string | null
  depart: LieuDepart
  personnes: number
  nuits: number
  confort: Confort
  mode: ModeTransport
  dateDepart: string
  /** null = saison déduite de la date */
  saison: Saison | null
  /** entre 0 et 0,3 */
  tauxImprevus: number
  activites: number[]
  /** null = une chambre pour deux */
  chambres: number | null
}

export interface RechercheBudget {
  budget: number
  depart: LieuDepart
  personnes: number
  nuits: number
  mode: ModeTransport
  dateDepart: string
}

export const LIMITES = {
  personnes: { min: 1, max: 20 },
  nuits: { min: 1, max: 60 },
  imprevusPct: { min: 0, max: 30 },
  budget: { min: 100, max: 50_000 },
} as const

const CONFORTS: Confort[] = ['eco', 'moyen', 'confort']
const MODES: ModeTransport[] = ['voiture', 'train', 'avion']
const SAISONS: Saison[] = ['basse', 'moyenne', 'haute']

export const versLieu = ({ nom, codePostal, lat, lon }: LieuDepart): LieuDepart => ({ nom, codePostal, lat, lon })
export const DEPART_PAR_DEFAUT: LieuDepart = versLieu(villesDepart[0])

/** Date du jour au format AAAA-MM-JJ, dans le fuseau de l'utilisateur. */
export function aujourdhui(maintenant = new Date()): string {
  const deuxChiffres = (n: number) => String(n).padStart(2, '0')
  return `${maintenant.getFullYear()}-${deuxChiffres(maintenant.getMonth() + 1)}-${deuxChiffres(maintenant.getDate())}`
}

/** Valeurs par défaut : 2 personnes, 7 nuits, confort moyen, départ de Paris en train, dans un mois. */
export function simulationParDefaut(dateDuJour: string): Simulation {
  return {
    destinationId: null,
    depart: DEPART_PAR_DEFAUT,
    personnes: 2,
    nuits: 7,
    confort: 'moyen',
    mode: 'train',
    dateDepart: ajouterJours(dateDuJour, 30),
    saison: null,
    tauxImprevus: 0.1,
    activites: [],
    chambres: null,
  }
}

export function rechercheBudgetParDefaut(dateDuJour: string): RechercheBudget {
  const { depart, personnes, nuits, mode, dateDepart } = simulationParDefaut(dateDuJour)
  return { budget: 2500, depart, personnes, nuits, mode, dateDepart }
}

export function versParametresVoyage(sim: Simulation, destination: Destination): ParametresVoyage {
  return {
    destination,
    depart: sim.depart,
    personnes: sim.personnes,
    nuits: sim.nuits,
    confort: sim.confort,
    mode: sim.mode,
    dateDepart: sim.dateDepart,
    saison: sim.saison ?? undefined,
    tauxImprevus: sim.tauxImprevus,
    activitesChoisies: sim.activites,
    chambres: sim.chambres ?? undefined,
  }
}

// ---------- Lecture sécurisée des paramètres d'URL ----------

function entier(valeur: string | null, min: number, max: number, defaut: number): number {
  if (valeur === null || valeur.trim() === '') return defaut
  const n = Number(valeur)
  if (!Number.isFinite(n)) return defaut
  return Math.min(max, Math.max(min, Math.round(n)))
}

function parmi<T extends string>(valeur: string | null, liste: readonly T[], defaut: T): T {
  return liste.includes(valeur as T) ? (valeur as T) : defaut
}

function dateValide(valeur: string | null, defaut: string): string {
  if (!valeur) return defaut
  try {
    lireDate(valeur)
    return valeur
  } catch {
    return defaut
  }
}

function lireDepart(params: URLSearchParams, defaut: LieuDepart): LieuDepart {
  const nom = params.get('de')?.trim()
  const lat = Number(params.get('lat'))
  const lon = Number(params.get('lon'))
  const codePostal = params.get('cp')?.trim() ?? ''
  const enFrance = lat > 41 && lat < 51.5 && lon > -5.5 && lon < 10
  if (!nom || !enFrance || !/^\d{5}$/.test(codePostal)) return defaut
  return { nom: nom.slice(0, 80), codePostal, lat, lon }
}

function ecrireDepart(params: URLSearchParams, depart: LieuDepart) {
  params.set('de', depart.nom)
  params.set('cp', depart.codePostal)
  params.set('lat', String(Math.round(depart.lat * 10_000) / 10_000))
  params.set('lon', String(Math.round(depart.lon * 10_000) / 10_000))
}

// ---------- Simulateur ----------

export function encoderSimulation(sim: Simulation): URLSearchParams {
  const params = new URLSearchParams()
  if (sim.destinationId) params.set('d', sim.destinationId)
  params.set('p', String(sim.personnes))
  params.set('n', String(sim.nuits))
  params.set('c', sim.confort)
  params.set('m', sim.mode)
  params.set('date', sim.dateDepart)
  ecrireDepart(params, sim.depart)
  if (sim.saison) params.set('s', sim.saison)
  if (sim.tauxImprevus !== 0.1) params.set('imp', String(Math.round(sim.tauxImprevus * 100)))
  if (sim.activites.length > 0) params.set('act', sim.activites.join(','))
  if (sim.chambres !== null) params.set('ch', String(sim.chambres))
  return params
}

export function decoderSimulation(params: URLSearchParams, defaut: Simulation): Simulation {
  const destination = trouverDestination(params.get('d') ?? '')
  const personnes = entier(params.get('p'), LIMITES.personnes.min, LIMITES.personnes.max, defaut.personnes)
  const nombreActivites = destination?.activitesSuggerees.length ?? 0
  const activites = [
    ...new Set(
      (params.get('act') ?? '')
        .split(',')
        .filter((v) => /^\d+$/.test(v))
        .map(Number)
        .filter((i) => i < nombreActivites),
    ),
  ].sort((a, b) => a - b)
  const saison = params.get('s')

  return {
    destinationId: destination?.id ?? null,
    depart: lireDepart(params, defaut.depart),
    personnes,
    nuits: entier(params.get('n'), LIMITES.nuits.min, LIMITES.nuits.max, defaut.nuits),
    confort: parmi(params.get('c'), CONFORTS, defaut.confort),
    mode: parmi(params.get('m'), MODES, defaut.mode),
    dateDepart: dateValide(params.get('date'), defaut.dateDepart),
    saison: SAISONS.includes(saison as Saison) ? (saison as Saison) : null,
    tauxImprevus:
      entier(params.get('imp'), LIMITES.imprevusPct.min, LIMITES.imprevusPct.max, Math.round(defaut.tauxImprevus * 100)) / 100,
    activites,
    chambres: params.has('ch') ? entier(params.get('ch'), 1, personnes, Math.ceil(personnes / 2)) : null,
  }
}

// ---------- Mode budget ----------

export function encoderBudget(recherche: RechercheBudget): URLSearchParams {
  const params = new URLSearchParams()
  params.set('b', String(recherche.budget))
  params.set('p', String(recherche.personnes))
  params.set('n', String(recherche.nuits))
  params.set('m', recherche.mode)
  params.set('date', recherche.dateDepart)
  ecrireDepart(params, recherche.depart)
  return params
}

export function decoderBudget(params: URLSearchParams, defaut: RechercheBudget): RechercheBudget {
  return {
    budget: entier(params.get('b'), LIMITES.budget.min, LIMITES.budget.max, defaut.budget),
    depart: lireDepart(params, defaut.depart),
    personnes: entier(params.get('p'), LIMITES.personnes.min, LIMITES.personnes.max, defaut.personnes),
    nuits: entier(params.get('n'), LIMITES.nuits.min, LIMITES.nuits.max, defaut.nuits),
    mode: parmi(params.get('m'), MODES, defaut.mode),
    dateDepart: dateValide(params.get('date'), defaut.dateDepart),
  }
}

/** « Nice · 2 pers. · 7 nuits · Moyen » */
export function nomSimulation(sim: Simulation, destination: Destination): string {
  const confort = { eco: 'Éco', moyen: 'Moyen', confort: 'Confort' }[sim.confort]
  return `${destination.nom} · ${sim.personnes} pers. · ${sim.nuits} nuit${sim.nuits > 1 ? 's' : ''} · ${confort}`
}

/** Clé stable d'un voyage, pour retrouver sa checklist de réservations. */
export function cleVoyage(sim: Simulation): string {
  return [sim.destinationId, sim.depart.codePostal, sim.dateDepart, sim.nuits, sim.personnes].join('|')
}
