export type Confort = 'eco' | 'moyen' | 'confort'
export type Saison = 'basse' | 'moyenne' | 'haute'
export type ModeTransport = 'voiture' | 'train' | 'avion'
export type Zone = 'france' | 'europe' | 'monde'
export type TypeActivite = 'culture' | 'nature' | 'gastronomie' | 'loisirs' | 'excursion' | 'plage' | 'sport'

export type ParConfort = Record<Confort, number>

export interface Coordonnees {
  lat: number
  lon: number
}

export interface ActiviteSuggeree {
  nom: string
  /** € par personne */
  prixIndicatif: number
  type: TypeActivite
}

export interface Destination extends Coordonnees {
  id: string
  nom: string
  pays: string
  zone: Zone
  emoji: string
  /** Code IATA de l'aéroport (ou de la ville) d'arrivée */
  aeroport: string
  description: string
  modesDisponibles: ModeTransport[]
  /** € par nuit pour une chambre double / un logement 2 personnes, en moyenne saison */
  logement: ParConfort
  /** € par personne et par jour (3 repas) */
  repas: ParConfort
  /** € par personne et par jour */
  activites: ParConfort
  /** € par personne et par jour */
  transportLocal: number
  /** Multiplicateurs appliqués au logement selon la saison */
  saison: Record<Saison, number>
  moisHauteSaison: number[]
  moisBasseSaison: number[]
  activitesSuggerees: ActiviteSuggeree[]
}

/** N'importe quelle commune de départ */
export interface LieuDepart extends Coordonnees {
  nom: string
  codePostal: string
}

/** Ville proposée en accès rapide */
export interface VilleDepart extends LieuDepart {
  id: string
}

export interface Aeroport extends Coordonnees {
  code: string
  nom: string
}

export interface TrancheAvion {
  /** Limite haute de la tranche, null = sans limite */
  jusquaKm: number | null
  prixParKm: number
}

export interface TarifsTransport {
  coefficientDetour: number
  allerRetour: boolean
  voiture: {
    consommationLitresPour100Km: number
    prixCarburantLitre: number
    peageParKm: number
    placesParVehicule: number
  }
  train: {
    prixParKm: number
    minimumParTrajet: number
    plafondParTrajet: number
  }
  avion: {
    forfaitParTrajet: number
    tranches: TrancheAvion[]
    coefficientSaison: Record<Saison, number>
    distanceMinimaleKm: number
  }
  accesAeroport: {
    prixParKm: number
    seuilKm: number
  }
}
