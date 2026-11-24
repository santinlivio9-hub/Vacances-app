import { BedDouble, Bike, Briefcase, Building2, Bus, CalendarRange, Car, DoorOpen, Footprints, HandHeart, Hotel, Landmark, Mountain, Music, PartyPopper, Plane, School, ShoppingBag, Sofa, Sunrise, TrainFront, TreePalm, TreePine, Trees, Tent, Umbrella, UsersRound, UtensilsCrossed, Dumbbell } from 'lucide-react'
import type { CleAvancee, Interet, ModeTransport, Style, TransportLocal, TypeActivite, TypeLogement, TypeVoyage } from '../domain/types'
import { LOGEMENTS } from '../engine/logements'
import { TYPES_VOYAGE } from '../tripTypes'

export const MODES_UI: Record<ModeTransport, { libelle: string; icone: typeof Car }> = {
  voiture: { libelle: 'Voiture', icone: Car },
  train: { libelle: 'Train', icone: TrainFront },
  avion: { libelle: 'Avion', icone: Plane },
  car: { libelle: 'Autocar', icone: Bus },
  covoiturage: { libelle: 'Covoiturage', icone: UsersRound },
}

export const STYLES_UI: Record<Style, { libelle: string; detail: string }> = {
  eco: { libelle: 'Éco', detail: 'Petits prix' },
  equilibre: { libelle: 'Équilibré', detail: 'Bon rapport' },
  confort: { libelle: 'Confort', detail: 'Sans compter' },
}

export const INTERETS_UI: Record<Interet, { libelle: string; icone: typeof Car }> = {
  culture: { libelle: 'Culture', icone: Landmark },
  nature: { libelle: 'Nature', icone: Mountain },
  plage: { libelle: 'Plage', icone: Umbrella },
  gastronomie: { libelle: 'Gastronomie', icone: UtensilsCrossed },
  sport: { libelle: 'Sport', icone: Dumbbell },
  fete: { libelle: 'Sorties', icone: PartyPopper },
  detente: { libelle: 'Détente', icone: Sofa },
  shopping: { libelle: 'Shopping', icone: ShoppingBag },
}

export const TRANSPORT_LOCAL_UI: Record<TransportLocal, { libelle: string; icone: typeof Car }> = {
  transports: { libelle: 'Transports', icone: Bus },
  voiture: { libelle: 'Voiture', icone: Car },
  velo: { libelle: 'Vélo', icone: Bike },
  pied: { libelle: 'À pied', icone: Footprints },
}

export const ACTIVITES_UI: Record<TypeActivite, { libelle: string; icone: typeof Car }> = {
  musee: { libelle: 'Musées', icone: Landmark },
  monument: { libelle: 'Monuments', icone: Landmark },
  parc: { libelle: 'Parcs et jardins', icone: Trees },
  plage: { libelle: 'Plages', icone: Umbrella },
  point_de_vue: { libelle: 'Points de vue', icone: Mountain },
  zoo: { libelle: 'Zoos et aquariums', icone: Trees },
  parc_attractions: { libelle: 'Parcs d’attractions', icone: PartyPopper },
  visite_guidee: { libelle: 'Visites guidées', icone: Footprints },
  nature: { libelle: 'Randonnées', icone: Mountain },
  spectacle: { libelle: 'Spectacles', icone: Music },
  marche: { libelle: 'Marchés', icone: ShoppingBag },
  autre: { libelle: 'Autres', icone: Landmark },
}

/** Cartes de choix du type de voyage : icône et dégradé (le reste vient de src/tripTypes/). */
export const TYPES_VOYAGE_UI: Record<TypeVoyage, { nom: string; accroche: string; icone: typeof Car; degrade: string; exemple: string }> = {
  vacances: { ...TYPES_VOYAGE.vacances, icone: TreePalm, degrade: 'from-ocean-400 to-ocean-700', exemple: 'Ex. : une semaine à Annecy en juillet' },
  flexible: { ...TYPES_VOYAGE.flexible, icone: CalendarRange, degrade: 'from-emerald-400 to-teal-700', exemple: 'Ex. : 1 à 2 semaines, peu importe quand' },
  weekend: { ...TYPES_VOYAGE.weekend, icone: Sunrise, degrade: 'from-corail-400 to-corail-700', exemple: 'Ex. : vendredi soir → dimanche' },
  stage: { ...TYPES_VOYAGE.stage, icone: Briefcase, degrade: 'from-violet-400 to-indigo-700', exemple: 'Ex. : 10 semaines de stage à Lyon' },
}

export const LOGEMENTS_UI: Record<TypeLogement, { libelle: string; icone: typeof Car }> = {
  hotel: { libelle: LOGEMENTS.hotel.nom, icone: Hotel },
  appartement: { libelle: LOGEMENTS.appartement.nom, icone: Building2 },
  habitant: { libelle: LOGEMENTS.habitant.nom, icone: HandHeart },
  auberge: { libelle: 'Auberge', icone: BedDouble },
  camping: { libelle: LOGEMENTS.camping.nom, icone: Tent },
  gite: { libelle: LOGEMENTS.gite.nom, icone: TreePine },
  studio: { libelle: LOGEMENTS.studio.nom, icone: DoorOpen },
  colocation: { libelle: LOGEMENTS.colocation.nom, icone: UsersRound },
  residence: { libelle: 'Résidence', icone: School },
}

/** Réglages avancés regroupés par carte (pour le badge « modifié » et la réinitialisation par section). */
export const SECTIONS_AVANCEES = {
  transport: ['vehicules', 'consommationL100', 'prixCarburant', 'peages', 'usure', 'classe', 'bagagesSoute', 'carteReduction', 'reservation', 'rayonHubMin', 'accesGare', 'transportLocal'],
  logement: ['typeLogement', 'etoiles', 'chambres', 'petitDejeuner', 'quartier', 'airbnbEntier', 'aubergeDortoir', 'fraisAirbnb', 'taxeSejour'],
  repas: ['partRestaurant', 'restosParJour', 'niveauResto'],
  activites: ['rythme', 'gratuitesUniquement', 'budgetMaxActivite', 'activitesIncluses', 'activitesExclues', 'tempsLibre'],
  divers: ['repartition', 'tauxImprevus', 'assurance', 'souvenirs'],
  sejour: ['remboursementTransport', 'activitesWeekend'],
} satisfies Record<string, CleAvancee[]>
