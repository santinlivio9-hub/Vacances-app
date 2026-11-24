import paysJson from './pays.json'
import prixBaseJson from './prixBase.json'
import transportJson from './transport.json'
import aeroportsJson from './aeroports.json'
import type { Coordonnees, Saison, Style, TypeActivite, TypeLogement } from '../domain/types'
import villesJson from './villes.json'

export type ParStyle = Record<Style, number>

export interface DonneesPays {
  nom: string
  continent: string
  /** Coût de la vie pour un voyageur, France = 1 */
  indice: number
  saison: Record<Saison, number>
  moisHauteSaison: number[]
  moisBasseSaison: number[]
}

export interface PrixBase {
  logement: {
    camping: ParStyle
    auberge: ParStyle
    hotel2: ParStyle
    hotel3: ParStyle
    hotel4: ParStyle
    appartement: ParStyle
    supplementCentre: number
    remiseCalme: number
    petitDejeunerParPersonne: ParStyle
    chambreAirbnb: ParStyle
    habitant: ParStyle
    aubergePrivee: ParStyle
    gite: ParStyle
    menageAirbnb: ParStyle
    serviceAirbnb: number
    taxeSejour: Record<'hotel2' | 'hotel3' | 'hotel4' | 'appartement' | 'habitant' | 'auberge' | 'camping' | 'gite', number>
  }
  repas: {
    courses: ParStyle
    snack: ParStyle
    restaurant: { simple: number; moyen: number; gastronomique: number }
    petitDejeunerMaison: number
  }
  transportLocal: Record<'transports' | 'voiture' | 'velo' | 'pied', ParStyle>
  activites: Record<TypeActivite, ParStyle>
  divers: { assuranceParPersonneParJour: number; souvenirsParPersonneParJour: ParStyle; partEnfant: number }
  sejourLong: {
    loyerMensuel: Record<TypeLogement, ParStyle>
    occupantSupplementaire: Record<TypeLogement, number>
    installation: Record<TypeLogement, number>
    coursesMois: ParStyle
    sortiesMois: ParStyle
    abonnementTransportMois: number
    veloMois: number
    voitureParKm: number
    stationnementMois: number
    diversMois: ParStyle
    coefZone: Record<'proche' | 'moyenne' | 'eloignee', number>
    vitessesKmH: Record<'pied' | 'velo' | 'transports' | 'voiture', number>
    petiteVille: number
  }
}

export interface Ville extends Coordonnees {
  nom: string
  pays: string
  /** Coefficient du loyer (grande ville du pays = 1) */
  loyer: number
  /** Abonnement mensuel de transport, s'il est connu */
  abonnement?: number
}

interface TrancheAvion {
  jusquaKm: number | null
  prixParKm: number
}

interface BaremeTerrestre {
  prixParKm: number
  minimumParTrajet: number
  plafondParTrajet: number
  vitesseMoyenneKmH: number
  distanceMaxKm: number
}

export interface Tarifs {
  coefficientDetour: number
  voiture: {
    consommationL100: number
    prixCarburant: number
    peageParKm: number
    placesParVehicule: number
    vitesseMoyenneKmH: number
    distanceMaxKm: number
  }
  train: BaremeTerrestre & { coefficientClasse: Record<'eco' | 'premium' | 'premiere', number> }
  car: BaremeTerrestre
  avion: {
    forfaitParTrajet: number
    tranches: TrancheAvion[]
    coefficientSaison: Record<Saison, number>
    coefficientClasse: Record<'eco' | 'premium' | 'premiere', number>
    bagageSouteParTrajet: number
    vitesseCroisiereKmH: number
    tempsAeroportMin: number
    distanceMinKm: number
  }
  accesAeroport: { prixParKm: number; seuilKm: number }
  partEnfant: number
}

export interface Aeroport extends Coordonnees {
  code: string
  nom: string
}

const pays = paysJson as unknown as { continents: Record<string, Omit<DonneesPays, 'continent'>>; pays: Record<string, DonneesPays> }

export const prixBase = prixBaseJson as unknown as PrixBase
export const tarifs = transportJson as unknown as Tarifs
export const aeroports = aeroportsJson as Aeroport[]
export const villes = (villesJson as { villes: Ville[] }).villes
export const tousLesPays = pays.pays
export const continents = pays.continents

/** Continent par défaut des pays absents de la base, déduit de la position. */
export function continentDepuisPosition({ lat, lon }: Coordonnees): string {
  if (lat > 34 && lon > -25 && lon < 45) return 'europe'
  if (lat > 12 && lat <= 42 && lon >= 34 && lon < 63) return 'moyen_orient'
  if (lat <= 37 && lon >= -20 && lon < 52) return 'afrique'
  if (lon >= 45 && lon < 150 && lat > -11) return 'asie'
  if (lon >= 110 || lon < -150) return 'oceanie'
  if (lon < -30 && lat >= 24) return 'amerique_nord'
  if (lon < -30 && lat >= 7) return 'amerique_centrale'
  if (lon < -30) return 'amerique_sud'
  return 'europe'
}

/**
 * Données de coût d'un pays. Si le pays n'est pas dans la base, on prend la valeur
 * moyenne de son continent (déduit de la position si besoin).
 */
export function donneesPays(code: string | undefined, position: Coordonnees): DonneesPays & { code?: string; estimationContinent: boolean } {
  const connu = code ? pays.pays[code.toLowerCase()] : undefined
  if (connu) return { ...connu, code: code!.toLowerCase(), estimationContinent: false }
  const continent = continentDepuisPosition(position)
  return { ...pays.continents[continent], continent, code: code?.toLowerCase(), estimationContinent: true }
}

export interface DestinationPopulaire extends Coordonnees {
  nom: string
  detail: string
  pays: string
  wikipedia: string
}

export { default as destinationsPopulaires } from './populaires.json'
