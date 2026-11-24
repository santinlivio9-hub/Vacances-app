import { aeroports, tarifs } from '../data'
import type { Coordonnees, ModeTransport, ReglagesAvances, ReglagesSimples, Saison } from '../domain/types'
import { prixAvionAllerSimple } from './apercu'
import { aeroportLePlusProche } from './geo'

/** Ce que le moteur sait du trajet (calculé sur la carte). */
export interface DonneesTrajet {
  depart: Coordonnees
  arrivee: Coordonnees
  distanceVolKm: number
  /** Distance par la route (OSRM, ou vol d'oiseau × 1,25) */
  distanceRouteKm: number
  /** Durée en voiture renvoyée par OSRM, si connue */
  dureeRouteMin?: number
  /** Faux s'il n'existe pas de route (mer, autre continent) */
  routeTerrestre: boolean
}

export interface LigneDetail {
  libelle: string
  montant: number
}

export interface EstimationTransport {
  mode: ModeTransport
  possible: boolean
  /** Pourquoi ce mode est impossible ou déconseillé */
  raison?: string
  /** Aller-retour, pour tout le groupe */
  total: number
  /** Durée d'un aller, porte à porte */
  dureeAllerMin: number
  details: LigneDetail[]
}

const IMPOSSIBLE = (mode: ModeTransport, raison: string): EstimationTransport => ({ mode, possible: false, raison, total: 0, dureeAllerMin: 0, details: [] })

function borne(bareme: { prixParKm: number; minimumParTrajet: number; plafondParTrajet: number }, km: number) {
  return Math.min(bareme.plafondParTrajet, Math.max(bareme.minimumParTrajet, km * bareme.prixParKm))
}

/**
 * Coût du transport aller-retour pour le groupe, selon le mode choisi.
 * Les enfants paient leur place (tarifs.partEnfant = 1).
 */
export function estimerTransport(
  mode: ModeTransport,
  trajet: DonneesTrajet,
  simple: Pick<ReglagesSimples, 'adultes' | 'enfants'>,
  avances: Pick<ReglagesAvances, 'vehicules' | 'consommationL100' | 'prixCarburant' | 'peages' | 'classe' | 'bagagesSoute'>,
  saison: Saison,
): EstimationTransport {
  const voyageurs = simple.adultes + simple.enfants * tarifs.partEnfant
  const route = trajet.distanceRouteKm

  if (mode === 'voiture') {
    const v = tarifs.voiture
    if (!trajet.routeTerrestre) return IMPOSSIBLE(mode, 'Aucune route ne relie ces deux points (mer ou océan à traverser).')
    if (route > v.distanceMaxKm) return IMPOSSIBLE(mode, `Plus de ${v.distanceMaxKm.toLocaleString('fr-FR')} km de route : trop long en voiture.`)
    const carburant = 2 * avances.vehicules * route * (avances.consommationL100 / 100) * avances.prixCarburant
    const peages = avances.peages ? 2 * avances.vehicules * route * v.peageParKm : 0
    return {
      mode,
      possible: true,
      total: carburant + peages,
      dureeAllerMin: trajet.dureeRouteMin ?? (route / v.vitesseMoyenneKmH) * 60,
      details: [
        { libelle: `Carburant aller-retour (${avances.vehicules} véhicule${avances.vehicules > 1 ? 's' : ''})`, montant: carburant },
        ...(peages ? [{ libelle: 'Péages', montant: peages }] : []),
      ],
    }
  }

  if (mode === 'train' || mode === 'car') {
    const bareme = tarifs[mode]
    if (!trajet.routeTerrestre) return IMPOSSIBLE(mode, `Pas de liaison terrestre : le ${mode} ne peut pas faire ce trajet.`)
    if (route > bareme.distanceMaxKm) return IMPOSSIBLE(mode, `Plus de ${bareme.distanceMaxKm.toLocaleString('fr-FR')} km : trop long en ${mode}.`)
    const coefficient = mode === 'train' ? tarifs.train.coefficientClasse[avances.classe] : 1
    const billet = borne(bareme, route) * coefficient
    return {
      mode,
      possible: true,
      total: 2 * billet * voyageurs,
      dureeAllerMin: (route / bareme.vitesseMoyenneKmH) * 60 + 30,
      details: [{ libelle: `Billets aller-retour (${Math.round(voyageurs)} × 2 × ${Math.round(billet)} €)`, montant: 2 * billet * voyageurs }],
    }
  }

  // Avion
  const a = tarifs.avion
  if (trajet.distanceVolKm < a.distanceMinKm && trajet.routeTerrestre) {
    return IMPOSSIBLE(mode, `Moins de ${a.distanceMinKm} km : pas de vol régulier, prenez plutôt le train ou la voiture.`)
  }
  const billet = prixAvionAllerSimple(trajet.distanceVolKm, saison) * a.coefficientClasse[avances.classe]
  const billets = 2 * billet * voyageurs
  const bagages = avances.bagagesSoute ? 2 * a.bagageSouteParTrajet * voyageurs : 0
  // Trajet jusqu'à l'aéroport de départ (aéroports français connus ; ailleurs on suppose un aéroport proche).
  const { distanceKm: versAeroport } = aeroportLePlusProche(trajet.depart, aeroports)
  const acces = versAeroport > tarifs.accesAeroport.seuilKm && versAeroport < 400 ? 2 * versAeroport * tarifs.accesAeroport.prixParKm * voyageurs : 0
  return {
    mode,
    possible: true,
    total: billets + bagages + acces,
    dureeAllerMin: (trajet.distanceVolKm / a.vitesseCroisiereKmH) * 60 + a.tempsAeroportMin + (acces ? (versAeroport / 90) * 60 : 0),
    details: [
      { libelle: `Billets d’avion aller-retour (${Math.round(voyageurs)} × 2 × ${Math.round(billet)} €)`, montant: billets },
      ...(bagages ? [{ libelle: 'Bagages en soute', montant: bagages }] : []),
      ...(acces ? [{ libelle: `Trajet jusqu’à l’aéroport (${Math.round(versAeroport)} km)`, montant: acces }] : []),
    ],
  }
}

export const MODES: ModeTransport[] = ['voiture', 'train', 'avion', 'car']
