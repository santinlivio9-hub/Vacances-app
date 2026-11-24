import { Bike, Bus, Car, Footprints, Landmark, Mountain, Music, PartyPopper, Plane, ShoppingBag, Sofa, TrainFront, Trees, Umbrella, UtensilsCrossed, Dumbbell } from 'lucide-react'
import type { CleAvancee, Interet, ModeTransport, Style, TransportLocal, TypeActivite } from '../domain/types'

export const MODES_UI: Record<ModeTransport, { libelle: string; icone: typeof Car }> = {
  voiture: { libelle: 'Voiture', icone: Car },
  train: { libelle: 'Train', icone: TrainFront },
  avion: { libelle: 'Avion', icone: Plane },
  car: { libelle: 'Car', icone: Bus },
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

/** Réglages avancés regroupés par carte (pour le badge « modifié » et la réinitialisation par section). */
export const SECTIONS_AVANCEES = {
  transport: ['vehicules', 'consommationL100', 'prixCarburant', 'peages', 'classe', 'bagagesSoute', 'transportLocal'],
  logement: ['typeLogement', 'etoiles', 'chambres', 'petitDejeuner', 'quartier'],
  repas: ['partRestaurant', 'restosParJour', 'niveauResto'],
  activites: ['rythme', 'gratuitesUniquement', 'budgetMaxActivite', 'activitesIncluses', 'activitesExclues', 'tempsLibre'],
  divers: ['repartition', 'tauxImprevus', 'assurance', 'souvenirs'],
} satisfies Record<string, CleAvancee[]>
