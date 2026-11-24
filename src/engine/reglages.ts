import { tarifs } from '../data'
import type { CleAvancee, Interet, ModeTransport, Reglages, ReglagesAvances, ReglagesSimples, RepartitionBudget, Style, TypeLogement } from '../domain/types'
import { harmoniserSimple, typeVoyage, TYPES_VOYAGE } from '../tripTypes'
import { ajouterJours, lireDate } from './dates'
import { estTypeLogement } from './logements'

/** Valeurs proposées par défaut au premier lancement. */
export function reglagesSimplesParDefaut(aujourdhui: string): ReglagesSimples {
  return {
    dateDepart: ajouterJours(aujourdhui, 30),
    nuits: 7,
    adultes: 2,
    enfants: 0,
    transport: 'train',
    style: 'equilibre',
    interets: ['culture', 'gastronomie'],
    budget: null,
    typeVoyage: 'vacances',
    logements: ['hotel', 'appartement'],
    flexible: { dureeMin: 7, dureeMax: 14, moisDebut: null, moisFin: null },
    stage: {
      dateFin: ajouterJours(aujourdhui, 30 + 70),
      joursParSemaine: 5,
      heureDebut: '09:00',
      heureFin: '17:30',
      trajetMaxMin: 30,
      retours: 'deux',
      gratification: 'legale',
      gratificationMois: 700,
    },
  }
}

const dateOk = (iso: unknown): iso is string => {
  try {
    return typeof iso === 'string' && !!lireDate(iso)
  } catch {
    return false
  }
}
const entier = (v: unknown, min: number, max: number, defaut: number) => (Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v as number))) : defaut)

/**
 * Complète des réglages simples venant d'une ancienne version, d'un lien de partage
 * ou d'un compte (champs ajoutés depuis : type de voyage, logements, dates flexibles, stage).
 */
export function normaliserSimple(brut: Partial<ReglagesSimples> & Record<string, unknown>, aujourdhui: string, typeLogementAncien?: unknown): ReglagesSimples {
  const defaut = reglagesSimplesParDefaut(aujourdhui)
  const s: ReglagesSimples = { ...defaut, ...brut } as ReglagesSimples
  if (!(s.typeVoyage in TYPES_VOYAGE)) s.typeVoyage = 'vacances'
  const f = (brut.flexible ?? {}) as Partial<ReglagesSimples['flexible']>
  const mois = (m: unknown) => (Number.isInteger(m) && (m as number) >= 1 && (m as number) <= 12 ? (m as number) : null)
  s.flexible = {
    dureeMin: entier(f.dureeMin, 1, 60, defaut.flexible.dureeMin),
    dureeMax: entier(f.dureeMax, 1, 60, defaut.flexible.dureeMax),
    moisDebut: mois(f.moisDebut),
    moisFin: mois(f.moisFin),
  }
  const st = (brut.stage ?? {}) as Partial<ReglagesSimples['stage']>
  s.stage = {
    dateFin: dateOk(st.dateFin) ? st.dateFin : ajouterJours(dateOk(s.dateDepart) ? s.dateDepart : defaut.dateDepart, 70),
    joursParSemaine: entier(st.joursParSemaine, 1, 7, 5),
    heureDebut: typeof st.heureDebut === 'string' && /^\d{2}:\d{2}$/.test(st.heureDebut) ? st.heureDebut : '09:00',
    heureFin: typeof st.heureFin === 'string' && /^\d{2}:\d{2}$/.test(st.heureFin) ? st.heureFin : '17:30',
    trajetMaxMin: entier(st.trajetMaxMin, 10, 90, 30),
    retours: st.retours === 'jamais' || st.retours === 'chaque' ? st.retours : 'deux',
    gratification: st.gratification === 'personnalisee' || st.gratification === 'aucune' ? st.gratification : 'legale',
    gratificationMois: entier(st.gratificationMois, 0, 5000, 700),
    ...(st.zone === 'proche' || st.zone === 'moyenne' || st.zone === 'eloignee' ? { zone: st.zone } : {}),
  }
  const logements = Array.isArray(brut.logements) ? (brut.logements.filter(estTypeLogement) as TypeLogement[]) : []
  s.logements = logements.length ? [...new Set(logements)] : estTypeLogement(typeLogementAncien) ? [typeLogementAncien] : typeVoyage(s).logementsParDefaut(s)
  return harmoniserSimple(s)
}

/** Version complète de réglages enregistrés avec une version précédente. */
export function normaliserReglages(r: { simple: Record<string, unknown>; modifies?: Partial<ReglagesAvances> }, aujourdhui: string): Reglages {
  const modifies = r.modifies && typeof r.modifies === 'object' ? { ...r.modifies } : {}
  if (modifies.typeLogement !== undefined && !estTypeLogement(modifies.typeLogement)) delete modifies.typeLogement
  return { simple: normaliserSimple(r.simple as Partial<ReglagesSimples>, aujourdhui, modifies.typeLogement), modifies }
}

export const REPARTITION_PAR_DEFAUT = { transport: 0.25, logement: 0.35, repas: 0.25, activites: 0.15 } as const

const parStyle = <T>(style: Style, valeurs: Record<Style, T>): T => valeurs[style]
const aime = (s: ReglagesSimples, ...interets: Interet[]) => interets.some((i) => s.interets.includes(i))

/**
 * Valeurs par défaut des réglages avancés, déduites des réponses du mode Simple
 * (comme un trancheur 3D déduit ses paramètres détaillés du profil choisi).
 */
export function reglagesAvancesParDefaut(s: ReglagesSimples): ReglagesAvances {
  const voyageurs = s.adultes + s.enfants
  const groupe = voyageurs >= 3
  // Logement calculé quand on ne compare pas : le plus logique parmi ceux cochés
  const logique = parStyle(s.style, {
    eco: groupe ? 'appartement' : 'hotel',
    equilibre: groupe && s.nuits >= 5 ? 'appartement' : 'hotel',
    confort: 'hotel',
  } as const)
  const coches = s.logements ?? []
  const typeLogement: TypeLogement = coches.length === 0 || coches.includes(logique) ? logique : coches[0]
  const rythme = aime(s, 'detente') ? 1 : 2

  return {
    // Transport
    vehicules: Math.max(1, Math.ceil(voyageurs / (s.enfants > 0 ? 5 : tarifs.voiture.placesParVehicule))),
    consommationL100: tarifs.voiture.consommationL100,
    prixCarburant: tarifs.voiture.prixCarburant,
    peages: true,
    classe: s.style === 'confort' ? 'premium' : 'eco',
    bagagesSoute: s.nuits >= 5 || s.style === 'confort' || s.enfants > 0,
    transportLocal: s.transport === 'voiture' ? 'voiture' : 'transports',
    // Logement
    typeLogement,
    etoiles: parStyle(s.style, { eco: 2, equilibre: 3, confort: 4 } as const),
    chambres: typeLogement === 'appartement' ? 1 : Math.max(1, Math.ceil(s.adultes / 2) + Math.floor(s.enfants / 3)),
    petitDejeuner: s.style === 'confort',
    quartier: s.style === 'eco' ? 'calme' : 'centre',
    // Repas
    partRestaurant: parStyle(s.style, { eco: 0.3, equilibre: 0.6, confort: 0.9 }) + (aime(s, 'gastronomie') ? 0.1 : 0),
    restosParJour: parStyle(s.style, { eco: 1, equilibre: 1, confort: 2 }),
    niveauResto: parStyle(s.style, { eco: 'simple', equilibre: 'moyen', confort: 'gastronomique' } as const),
    // Activités
    rythme,
    gratuitesUniquement: false,
    budgetMaxActivite: s.style === 'eco' ? 25 : null,
    activitesIncluses: [],
    activitesExclues: [],
    tempsLibre: rythme === 1,
    // Budget et divers
    repartition: { ...REPARTITION_PAR_DEFAUT },
    tauxImprevus: 0.1,
    assurance: s.transport === 'avion',
    souvenirs: s.style !== 'eco',
    airbnbEntier: true,
    aubergeDortoir: s.style === 'eco' || voyageurs === 1,
    fraisAirbnb: true,
    taxeSejour: true,
    remboursementTransport: true,
    activitesWeekend: s.interets.length > 0,
    ...typeVoyage(s).avancesParDefaut?.(s),
  }
}

/** Réglages réellement utilisés : valeurs par défaut + valeurs modifiées à la main. */
export function reglagesEffectifs(r: Reglages): ReglagesAvances {
  return { ...reglagesAvancesParDefaut(r.simple), ...r.modifies }
}

export function estModifie(r: Reglages, cle: CleAvancee): boolean {
  return Object.prototype.hasOwnProperty.call(r.modifies, cle)
}

/**
 * Mode de transport le plus logique pour une distance (km, vol d'oiseau).
 * `routeTerrestre` = faux si OSRM n'a pas trouvé de route (mer, autre continent).
 */
export function modeConseille(distanceKm: number, routeTerrestre: boolean): ModeTransport {
  if (!routeTerrestre || distanceKm > 1200) return 'avion'
  if (distanceKm < 250) return 'voiture'
  if (distanceKm <= 900) return 'train'
  return 'avion'
}

/**
 * Change une part de la répartition du budget et redistribue la différence sur les autres
 * parts, proportionnellement, pour que la somme reste 100 %.
 */
export function ajusterRepartition(rep: RepartitionBudget, cle: keyof RepartitionBudget, valeur: number): RepartitionBudget {
  const v = Math.min(1, Math.max(0, valeur))
  const autres = (Object.keys(rep) as (keyof RepartitionBudget)[]).filter((k) => k !== cle)
  const sommeAutres = autres.reduce((s, k) => s + rep[k], 0)
  const resultat = { ...rep, [cle]: v }
  for (const k of autres) resultat[k] = sommeAutres > 0 ? (rep[k] / sommeAutres) * (1 - v) : (1 - v) / autres.length
  return resultat
}
