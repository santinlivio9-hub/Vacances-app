import { donneesPays } from '../data'
import type { DatesFlexibles, Saison } from '../domain/types'
import { saisonDuMois } from './apercu'
import { estimerCouts, type EntreeCouts } from './couts'
import { ajouterJours, lireDate } from './dates'

export interface Periode {
  mois: number
  annee: number
  /** Départ proposé (un samedi vers le milieu du mois) */
  dateDepart: string
  saison: Saison
  /** Total pour la durée la plus courte */
  nuits: number
  total: number
  /** Total pour la durée la plus longue */
  nuitsMax: number
  totalMax: number
}

export interface ResultatPeriodes {
  /** Tous les mois testés, dans l'ordre chronologique */
  periodes: Periode[]
  /** Les 3 moins chers, du moins cher au plus cher */
  meilleures: Periode[]
  /** Écart entre le mois le plus cher et le moins cher (durée la plus courte) */
  ecartMax: number
  toutesHauteSaison: boolean
  alerte?: string
}

export const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const nomPeriode = (p: Pick<Periode, 'mois' | 'annee'>) => `${NOMS_MOIS[p.mois - 1]} ${p.annee}`

/** Mois inclus dans la période (gère « de novembre à février »). */
export function moisDansPeriode(mois: number, f: Pick<DatesFlexibles, 'moisDebut' | 'moisFin'>): boolean {
  if (f.moisDebut == null || f.moisFin == null) return true
  return f.moisDebut <= f.moisFin ? mois >= f.moisDebut && mois <= f.moisFin : mois >= f.moisDebut || mois <= f.moisFin
}

/** Premier samedi à partir du 10 du mois. */
function samediDuMois(annee: number, mois: number): string {
  let d = `${annee}-${String(mois).padStart(2, '0')}-10`
  while (lireDate(d).getUTCDay() !== 6) d = ajouterJours(d, 1)
  return d
}

/** Les 12 prochains mois, en commençant au moins 3 semaines après aujourd'hui. */
export function moisCandidats(f: Pick<DatesFlexibles, 'moisDebut' | 'moisFin'>, aujourdhui: string): { mois: number; annee: number; dateDepart: string }[] {
  const debut = lireDate(ajouterJours(aujourdhui, 21))
  const liste: { mois: number; annee: number; dateDepart: string }[] = []
  for (let i = 0; i < 12; i++) {
    const m0 = debut.getUTCMonth() + i
    const annee = debut.getUTCFullYear() + Math.floor(m0 / 12)
    const mois = (m0 % 12) + 1
    if (!moisDansPeriode(mois, f)) continue
    let dateDepart = samediDuMois(annee, mois)
    if (dateDepart < ajouterJours(aujourdhui, 21)) dateDepart = ajouterJours(aujourdhui, 21)
    liste.push({ mois, annee, dateDepart })
  }
  return liste
}

/**
 * Dates flexibles : teste chaque mois possible avec la durée la plus courte et la plus longue,
 * puis garde les 3 mois les moins chers. Les prix suivent la saison du pays (logement)
 * et le barème saisonnier des vols : ce n'est pas un relevé des tarifs jour par jour.
 */
export function meilleuresPeriodes(entree: EntreeCouts, aujourdhui: string): ResultatPeriodes {
  const s = entree.reglages.simple
  const f = s.flexible
  const nuitsMin = Math.max(1, f.dureeMin)
  const nuitsMax = Math.max(nuitsMin, f.dureeMax)
  const pays = donneesPays(entree.arrivee.pays, entree.arrivee)
  const total = (dateDepart: string, nuits: number) => estimerCouts({ ...entree, reglages: { ...entree.reglages, simple: { ...s, dateDepart, nuits } } }).total

  const periodes: Periode[] = moisCandidats(f, aujourdhui).map(({ mois, annee, dateDepart }) => ({
    mois,
    annee,
    dateDepart,
    saison: saisonDuMois(pays, mois),
    nuits: nuitsMin,
    total: total(dateDepart, nuitsMin),
    nuitsMax,
    totalMax: nuitsMax === nuitsMin ? total(dateDepart, nuitsMin) : total(dateDepart, nuitsMax),
  }))
  const triees = [...periodes].sort((a, b) => a.total - b.total || a.dateDepart.localeCompare(b.dateDepart))
  const meilleures = triees.slice(0, 3)
  const ecartMax = triees.length ? triees[triees.length - 1].total - triees[0].total : 0
  const toutesHauteSaison = periodes.length > 0 && periodes.every((p) => p.saison === 'haute')
  return {
    periodes,
    meilleures,
    ecartMax,
    toutesHauteSaison,
    alerte: periodes.length === 0 ? 'Aucun mois ne correspond à cette période.' : toutesHauteSaison ? 'Toute la période choisie est en haute saison à destination : élargissez-la pour payer moins cher.' : undefined,
  }
}
