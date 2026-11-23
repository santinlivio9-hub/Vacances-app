import type { Destination, LieuDepart, ModeTransport, Saison, TarifsTransport } from '../data/types'
import type { ContexteCalcul } from './contexte'
import { aeroportLePlusProche, distanceKm } from './geo'
import type { OptionTransport } from './types'

export const MODES_TRANSPORT: ModeTransport[] = ['voiture', 'train', 'avion']

export const NOMS_MODES: Record<ModeTransport, string> = { voiture: 'voiture', train: 'train', avion: 'avion' }

const nombreDeTrajets = (tarifs: TarifsTransport) => (tarifs.allerRetour ? 2 : 1)

const depuisLaCorse = (lieu: LieuDepart) => lieu.codePostal.startsWith('20')

/** Voiture : carburant + péages, en € par km et par véhicule. */
export function coutVoitureParKm(tarifs: TarifsTransport): number {
  const { consommationLitresPour100Km, prixCarburantLitre, peageParKm } = tarifs.voiture
  return (consommationLitresPour100Km / 100) * prixCarburantLitre + peageParKm
}

/** Train : prix d'un aller simple par personne, borné par le minimum et le plafond. */
export function prixTrainParPersonne(km: number, tarifs: TarifsTransport): number {
  const { prixParKm, minimumParTrajet, plafondParTrajet } = tarifs.train
  return Math.min(plafondParTrajet, Math.max(minimumParTrajet, km * prixParKm))
}

/** Avion : prix d'un aller simple par personne (forfait + barème dégressif par tranche), selon la saison. */
export function prixVolParPersonne(km: number, saison: Saison, tarifs: TarifsTransport): number {
  const { forfaitParTrajet, tranches, coefficientSaison } = tarifs.avion
  let prix = forfaitParTrajet
  let debutTranche = 0
  for (const tranche of tranches) {
    const finTranche = tranche.jusquaKm ?? Infinity
    if (km > debutTranche) prix += (Math.min(km, finTranche) - debutTranche) * tranche.prixParKm
    debutTranche = finTranche
  }
  return prix * coefficientSaison[saison]
}

function indisponible(mode: ModeTransport, raison: string, distance: number): OptionTransport {
  return { mode, disponible: false, raison, cout: 0, distanceKm: distance }
}

function optionVoiture(depart: LieuDepart, destination: Destination, personnes: number, { tarifs }: ContexteCalcul): OptionTransport {
  const distance = distanceKm(depart, destination) * tarifs.coefficientDetour
  if (!destination.modesDisponibles.includes('voiture')) {
    return indisponible('voiture', `Pas de trajet en voiture possible jusqu'à ${destination.nom}.`, distance)
  }
  if (depuisLaCorse(depart)) return indisponible('voiture', 'Depuis la Corse, seul l’avion est proposé.', distance)

  const vehicules = Math.ceil(personnes / tarifs.voiture.placesParVehicule)
  const cout = vehicules * distance * coutVoitureParKm(tarifs) * nombreDeTrajets(tarifs)
  return { mode: 'voiture', disponible: true, cout, distanceKm: distance, vehicules }
}

function optionTrain(depart: LieuDepart, destination: Destination, personnes: number, { tarifs }: ContexteCalcul): OptionTransport {
  const distance = distanceKm(depart, destination) * tarifs.coefficientDetour
  if (!destination.modesDisponibles.includes('train')) {
    return indisponible('train', `Pas de liaison en train raisonnable jusqu'à ${destination.nom}.`, distance)
  }
  if (depuisLaCorse(depart)) return indisponible('train', 'Depuis la Corse, seul l’avion est proposé.', distance)

  const prixParPersonne = prixTrainParPersonne(distance, tarifs) * nombreDeTrajets(tarifs)
  return { mode: 'train', disponible: true, cout: prixParPersonne * personnes, distanceKm: distance, prixParPersonne }
}

function optionAvion(
  depart: LieuDepart,
  destination: Destination,
  personnes: number,
  saison: Saison,
  { tarifs, aeroports }: ContexteCalcul,
): OptionTransport {
  const { aeroport, distanceKm: versAeroport } = aeroportLePlusProche(depart, aeroports)
  const distanceVol = distanceKm(aeroport, destination)
  if (!destination.modesDisponibles.includes('avion')) {
    return indisponible('avion', `Pas de vol pour ${destination.nom}.`, distanceVol)
  }
  // Depuis une île, l'avion reste possible même sur une courte distance.
  const distanceMinimale = depuisLaCorse(depart) ? 0 : tarifs.avion.distanceMinimaleKm
  if (distanceVol < distanceMinimale) {
    return indisponible('avion', `Trop proche pour prendre l'avion (moins de ${distanceMinimale} km).`, distanceVol)
  }

  const { prixParKm, seuilKm } = tarifs.accesAeroport
  const accesAeroportKm = versAeroport > seuilKm ? versAeroport * tarifs.coefficientDetour : 0
  const allerSimple = prixVolParPersonne(distanceVol, saison, tarifs) + accesAeroportKm * prixParKm
  const prixParPersonne = allerSimple * nombreDeTrajets(tarifs)
  return {
    mode: 'avion',
    disponible: true,
    cout: prixParPersonne * personnes,
    distanceKm: distanceVol,
    prixParPersonne,
    aeroportDepart: aeroport,
    accesAeroportKm,
  }
}

/** Les trois modes de transport, possibles ou non, avec leur coût aller-retour pour le groupe. */
export function optionsTransport(
  depart: LieuDepart,
  destination: Destination,
  personnes: number,
  saison: Saison,
  contexte: ContexteCalcul,
): OptionTransport[] {
  return [
    optionVoiture(depart, destination, personnes, contexte),
    optionTrain(depart, destination, personnes, contexte),
    optionAvion(depart, destination, personnes, saison, contexte),
  ]
}

/** Le mode souhaité s'il est possible, sinon le moins cher des modes possibles. */
export function choisirTransport(options: OptionTransport[], souhaite: ModeTransport): OptionTransport | null {
  const voulu = options.find((o) => o.mode === souhaite && o.disponible)
  if (voulu) return voulu
  const possibles = options.filter((o) => o.disponible).sort((a, b) => a.cout - b.cout)
  return possibles[0] ?? null
}
