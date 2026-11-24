/** Types partagés par les données, les services, le moteur et l'interface. */

export interface Coordonnees {
  lat: number
  lon: number
}

/** Un point choisi sur la carte (adresse, ville, lieu…). */
export interface Lieu extends Coordonnees {
  /** Nom court : « Lisbonne », « 12 rue de la Paix » */
  nom: string
  /** Précision : « Lisbonne, Portugal » */
  detail: string
  /** Code pays ISO 3166-1 alpha-2 en minuscules (« fr », « pt »), si connu */
  pays?: string
  /** Code postal, si connu (sert aux liens de réservation) */
  codePostal?: string
  /** Type renvoyé par le service (city, street, house…), à titre indicatif */
  type?: string
}

export type ModeTransport = 'voiture' | 'train' | 'avion' | 'car' | 'covoiturage'
/** Ce qui compte le plus pour choisir le trajet */
export type PrioriteTrajet = 'prix' | 'rapide' | 'compromis'
/** Trajets proposés, simples ou combinés */
export type TypeTrajet = 'voiture' | 'covoiturage' | 'autocar' | 'train' | 'voiture+train' | 'train+local' | 'avion' | 'voiture+avion'
export type CarteReduction = 'aucune' | 'avantage' | 'jeune'
/** Moment de la réservation : place le prix dans la fourchette */
export type MomentReservation = 'tot' | 'normal' | 'derniere'
export type Style = 'eco' | 'equilibre' | 'confort'
export type Saison = 'basse' | 'moyenne' | 'haute'
export type Interet = 'culture' | 'nature' | 'plage' | 'gastronomie' | 'sport' | 'fete' | 'detente' | 'shopping'

export type TypeVoyage = 'vacances' | 'flexible' | 'weekend' | 'stage'

/**
 * Types de logement. Séjours courts : hôtel, appartement (Airbnb), chambre chez l'habitant,
 * auberge, camping, gîte. Séjours longs (au mois) : studio meublé, colocation, résidence.
 */
export type TypeLogement = 'hotel' | 'appartement' | 'habitant' | 'auberge' | 'camping' | 'gite' | 'studio' | 'colocation' | 'residence'

/** Dates flexibles : une durée souple et une période possible. */
export interface DatesFlexibles {
  /** Nuits */
  dureeMin: number
  dureeMax: number
  /** Mois de 1 à 12 ; null = peu importe */
  moisDebut: number | null
  moisFin: number | null
}

/** Allers-retours chez soi pendant un séjour long. */
export type FrequenceRetour = 'jamais' | 'deux' | 'chaque'

/** Stage ou séjour long : l'arrivée est le lieu de travail. */
export interface ReglagesStage {
  /** AAAA-MM-JJ, dernier jour */
  dateFin: string
  joursParSemaine: number
  /** « 09:00 » */
  heureDebut: string
  heureFin: string
  /** Temps de trajet maximum accepté entre le logement et le travail (minutes) */
  trajetMaxMin: number
  retours: FrequenceRetour
  /** Zone de logement retenue autour du lieu de travail (proposition choisie) */
  zone?: 'proche' | 'moyenne' | 'eloignee'
  /** Stage gratifié : minimum légal, montant personnalisé, ou pas de gratification */
  gratification: 'legale' | 'personnalisee' | 'aucune'
  /** Montant mensuel quand il est personnalisé (€ net par mois) */
  gratificationMois: number
}
export type TransportLocal = 'transports' | 'voiture' | 'velo' | 'pied'
export type ClasseVoyage = 'eco' | 'premium' | 'premiere'
export type Rythme = 1 | 2 | 3
export type NiveauResto = 'simple' | 'moyen' | 'gastronomique'
export type Quartier = 'centre' | 'calme'

/** Les quelques questions du mode Simple. */
/** Postes de dépense (mêmes noms que le moteur de coûts) */
export type PosteDepense = 'transport' | 'logement' | 'repas' | 'activites' | 'transportLocal' | 'divers' | 'imprevus'

export type TypeVoyageur = 'adulte' | 'enfant' | 'bebe'

/**
 * Qui paie quoi :
 * - part : paie sa part, et celle des voyageurs qui ne paient pas
 * - rien : invité, ne paie rien
 * - postes : paie seulement sa propre part des postes cochés (et des activités où il est payeur)
 * - fixe : donne un montant total
 * - pourcentage : paie un pourcentage du total
 */
export type ProfilPaiement = 'part' | 'rien' | 'postes' | 'fixe' | 'pourcentage'

export interface Voyageur {
  id: string
  /** Facultatif : « Adulte 1 », « Enfant 1 » sinon */
  prenom?: string
  type: TypeVoyageur
  /** Âge (enfants et bébés) */
  age?: number
  paiement: ProfilPaiement
  /** Profil « postes » : postes auxquels il participe */
  postes?: PosteDepense[]
  /** Profil « fixe » : montant en euros */
  montant?: number
  /** Profil « pourcentage » : 0 à 100 */
  pourcentage?: number
  /** Mode Avancé : poids dans la redistribution entre ceux qui paient leur part (1 par défaut) */
  poids?: number
}

/** Mode Avancé : participants et payeurs d'une activité (ids de voyageurs ; absent = tout le monde / règle par défaut) */
export interface RegleActivite {
  participants?: string[]
  payeurs?: string[]
}

export interface ReglagesRepartition {
  activites?: Record<string, RegleActivite>
  /** Logement réparti par chambre plutôt que par personne */
  logementParChambre?: boolean
  /** Chambres : listes d'ids de voyageurs (logementParChambre) */
  chambres?: string[][]
}

export interface ReglagesSimples {
  typeVoyage: TypeVoyage
  /** AAAA-MM-JJ */
  dateDepart: string
  nuits: number
  adultes: number
  enfants: number
  transport: ModeTransport
  /** Moins cher, plus rapide ou compromis : sert à choisir le trajet */
  priorite: PrioriteTrajet
  /** Autorise les trajets combinés (voiture + train, voiture + avion…) */
  combinaisons: boolean
  /** Trajet choisi dans le comparatif (null : le meilleur selon la priorité) */
  trajetChoisi: TypeTrajet | null
  style: Style
  interets: Interet[]
  /** Budget total en euros ; null = pas de limite */
  budget: number | null
  /** Types de logement cochés : chacun est calculé et comparé */
  logements: TypeLogement[]
  flexible: DatesFlexibles
  stage: ReglagesStage
}

/** Tous les réglages détaillés du mode Avancé. Leurs valeurs par défaut sont déduites des réglages simples. */
export interface ReglagesAvances {
  // Transport
  vehicules: number
  consommationL100: number
  prixCarburant: number
  peages: boolean
  classe: ClasseVoyage
  bagagesSoute: boolean
  transportLocal: TransportLocal
  /** Temps de route maximum pour rejoindre une gare ou un aéroport (minutes) */
  rayonHubMin: number
  /** Voiture laissée au parking de la gare, ou dépose par un proche */
  accesGare: 'parking' | 'depose'
  carteReduction: CarteReduction
  reservation: MomentReservation
  /** Compte l'usure de la voiture (entretien, pneus), en plus du carburant */
  usure: boolean
  // Logement
  typeLogement: TypeLogement
  etoiles: 2 | 3 | 4
  chambres: number
  petitDejeuner: boolean
  quartier: Quartier
  /** Airbnb : logement entier (sinon une chambre) */
  airbnbEntier: boolean
  /** Auberge : lit en dortoir (sinon chambre privée) */
  aubergeDortoir: boolean
  /** Frais de ménage et de service (Airbnb) */
  fraisAirbnb: boolean
  taxeSejour: boolean
  // Repas
  partRestaurant: number // 0 à 1
  restosParJour: number // 0 à 3
  niveauResto: NiveauResto
  // Activités
  rythme: Rythme
  gratuitesUniquement: boolean
  budgetMaxActivite: number | null
  activitesIncluses: string[]
  activitesExclues: string[]
  tempsLibre: boolean
  // Budget et divers
  repartition: RepartitionBudget
  tauxImprevus: number // 0 à 0,3
  assurance: boolean
  souvenirs: boolean
  // Séjour long
  /** L'employeur rembourse la moitié de l'abonnement de transport (obligatoire en France) */
  remboursementTransport: boolean
  /** Activités proposées pour les week-ends */
  activitesWeekend: boolean
}

/** Répartition du budget entre postes, en parts dont la somme vaut 1. */
export interface RepartitionBudget {
  transport: number
  logement: number
  repas: number
  activites: number
}

export type CleAvancee = keyof ReglagesAvances

/** Réglages d'un voyage : les simples + uniquement les valeurs avancées modifiées à la main. */
export interface Reglages {
  simple: ReglagesSimples
  modifies: Partial<ReglagesAvances>
}

/** Un lieu à visiter trouvé autour de la destination. */
export type TypeActivite =
  | 'musee'
  | 'monument'
  | 'parc'
  | 'plage'
  | 'point_de_vue'
  | 'zoo'
  | 'parc_attractions'
  | 'visite_guidee'
  | 'nature'
  | 'spectacle'
  | 'marche'
  | 'autre'

export interface LieuVisite extends Coordonnees {
  id: string
  nom: string
  type: TypeActivite
  /** « fr:Tour Eiffel » (tag OSM) ou titre Wikipédia */
  wikipedia?: string
  wikidata?: string
  site?: string
  /** Tags OSM utiles (frais d'entrée, horaires…) */
  gratuit?: boolean
  /** Prix d'entrée adulte relevé dans OpenStreetMap (tag charge), en euros */
  prixEntree?: number
  source: 'osm' | 'wikipedia' | 'generique'
}

export interface ResumeWikipedia {
  titre: string
  extrait: string
  image?: string
  lien: string
  langue: 'fr' | 'en'
}

export interface Trajet {
  distanceKm: number
  dureeMin: number
  /** Points du tracé [lat, lon] */
  trace: [number, number][]
  /** Vrai si calculé à vol d'oiseau faute de réponse du service de routage */
  approximatif: boolean
}

/** Une activité placée dans l'itinéraire. */
export interface ActivitePlanifiee {
  lieu: LieuVisite
  /** « 9 h 30 » */
  heure: string
  moment: 'matin' | 'apres-midi' | 'soir'
  /** Prix pour tout le groupe (0 = gratuit) */
  prix: number
  /** Vrai si le prix vient d'OpenStreetMap (sinon : prix estimé d'après le type de lieu) */
  prixConnu?: boolean
}

export interface JourItineraire {
  /** 0 = jour d'arrivée */
  index: number
  /** AAAA-MM-JJ */
  date: string
  titre: string
  type: 'arrivee' | 'plein' | 'libre' | 'depart'
  activites: ActivitePlanifiee[]
  /** Conseils pratiques (horaires de départ, temps libre…) */
  notes: string[]
}

export interface Itineraire {
  jours: JourItineraire[]
  totalActivites: number
  /** D'où viennent les lieux */
  source: 'osm' | 'wikipedia' | 'aucun'
  graine: number
}
