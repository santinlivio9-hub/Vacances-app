import { donneesPays, prixBase, tarifs } from '../data'
import type { Coordonnees, ModeTransport, Saison } from '../domain/types'

/**
 * Aperçu affiché sur la carte : « à partir de … € / pers. ».
 * Hypothèse volontairement basse : 2 adultes, style Éco, hôtel 2 étoiles partagé,
 * repas simples, transport le moins cher possible (aller-retour). Le calcul détaillé
 * se fait ensuite dans l'écran Configuration.
 */

export function saisonDuMois(pays: { moisHauteSaison: number[]; moisBasseSaison: number[] }, mois: number): Saison {
  if (pays.moisHauteSaison.includes(mois)) return 'haute'
  if (pays.moisBasseSaison.includes(mois)) return 'basse'
  return 'moyenne'
}

/** Prix d'un billet d'avion aller simple en classe éco : forfait + prix au km dégressif par tranches. */
export function prixAvionAllerSimple(distanceKm: number, saison: Saison = 'moyenne'): number {
  const { forfaitParTrajet, tranches, coefficientSaison } = tarifs.avion
  let reste = distanceKm
  let debut = 0
  let prix = forfaitParTrajet
  for (const { jusquaKm, prixParKm } of tranches) {
    const longueur = jusquaKm === null ? reste : Math.min(reste, jusquaKm - debut)
    prix += Math.max(0, longueur) * prixParKm
    reste -= longueur
    if (jusquaKm !== null) debut = jusquaKm
    if (reste <= 0) break
  }
  return prix * coefficientSaison[saison]
}

function prixTerrestre(bareme: { prixParKm: number; minimumParTrajet: number; plafondParTrajet: number }, km: number) {
  return Math.min(bareme.plafondParTrajet, Math.max(bareme.minimumParTrajet, km * bareme.prixParKm))
}

export interface EntreeApercu {
  arrivee: Coordonnees & { pays?: string }
  /** Distance à vol d'oiseau */
  distanceVolKm: number
  /** Distance par la route si elle existe (sinon estimée) */
  distanceRouteKm: number
  routeTerrestre: boolean
  nuits: number
  mois: number
}

export interface Apercu {
  parPersonne: number
  /** Mode de transport le moins cher retenu pour l'aperçu */
  mode: ModeTransport
  transport: number
  sejour: number
  saison: Saison
  estimationContinent: boolean
}

/** Transport aller-retour le moins cher, par personne, parmi les modes réalistes. */
export function transportLeMoinsCher(distanceVolKm: number, distanceRouteKm: number, routeTerrestre: boolean, saison: Saison) {
  const options: { mode: ModeTransport; prix: number }[] = []
  const v = tarifs.voiture
  if (routeTerrestre && distanceRouteKm <= v.distanceMaxKm) {
    const vehicule = distanceRouteKm * ((v.consommationL100 / 100) * v.prixCarburant + v.peageParKm)
    options.push({ mode: 'voiture', prix: vehicule }) // partagé à 2, aller-retour : × 2 / 2
  }
  if (routeTerrestre && distanceRouteKm <= tarifs.train.distanceMaxKm) options.push({ mode: 'train', prix: 2 * prixTerrestre(tarifs.train, distanceRouteKm) })
  if (routeTerrestre && distanceRouteKm <= tarifs.car.distanceMaxKm) options.push({ mode: 'car', prix: 2 * prixTerrestre(tarifs.car, distanceRouteKm) })
  if (distanceVolKm >= tarifs.avion.distanceMinKm || options.length === 0) {
    options.push({ mode: 'avion', prix: 2 * prixAvionAllerSimple(distanceVolKm, saison) })
  }
  return options.reduce((a, b) => (b.prix < a.prix ? b : a))
}

export function apercuPrix(e: EntreeApercu): Apercu {
  const pays = donneesPays(e.arrivee.pays, e.arrivee)
  const saison = saisonDuMois(pays, e.mois)
  const { mode, prix: transport } = transportLeMoinsCher(e.distanceVolKm, e.distanceRouteKm, e.routeTerrestre, saison)
  const nuitee = (prixBase.logement.hotel2.eco / 2) * pays.indice * pays.saison[saison]
  const repas = (prixBase.repas.petitDejeunerMaison + prixBase.repas.courses.eco + prixBase.repas.snack.eco) * pays.indice
  const nuits = Math.max(1, e.nuits)
  const sejour = nuits * nuitee + (nuits + 1) * repas
  return {
    parPersonne: Math.round((transport + sejour) / 10) * 10,
    mode,
    transport,
    sejour,
    saison,
    estimationContinent: pays.estimationContinent,
  }
}
