import { hubs, tarifs, tarifsTrain, type AeroportHub, type Gare } from '../data'
import type { ClasseVoyage, Coordonnees, ModeTransport, PrioriteTrajet, ReglagesAvances, Saison, TypeTrajet } from '../domain/types'
import { prixAvionAllerSimple } from './apercu'
import { distanceKm } from './geo'
import type { DonneesTrajet, LigneDetail } from './transport'

/**
 * Trajets simples et combinés (voiture + train, voiture + avion, train + transport local…).
 * Chaque trajet est une suite d'étapes avec une durée et une fourchette de prix ; on garde
 * le meilleur trajet de chaque type et on écarte ceux qui n'ont pas de sens.
 */

/** Prix bas, prix haut et prix le plus probable (selon le moment de la réservation). */
export interface Fourchette {
  bas: number
  haut: number
  milieu: number
}

export type ModeEtape = 'voiture' | 'covoiturage' | 'autocar' | 'train' | 'avion' | 'transports' | 'marche' | 'taxi' | 'parking'

export interface Etape {
  mode: ModeEtape
  de: string
  vers: string
  depuis: Coordonnees
  jusqua: Coordonnees
  distanceKm: number
  dureeMin: number
  /** Prix d'un aller pour tout le groupe (parking : pour tout le séjour) */
  prix: Fourchette
  /** « OUIGO ou TGV INOUI », « Voiture laissée 3 jours » */
  detail?: string
  /** Codes IATA des aéroports (liens de réservation) */
  codes?: [string, string]
  /** Payé une seule fois (parking), pas à l'aller et au retour */
  uneFois?: boolean
  /** Prix tiré d'un barème officiel (tarifs SNCF) plutôt que d'une estimation au km */
  tarifOfficiel?: boolean
}

export interface OptionTrajet {
  type: TypeTrajet
  /** Mode principal (celui qu'on réserve) */
  mode: ModeTransport
  /** Trajet combiné : voiture jusqu'à une gare ou un aéroport, ou long trajet local à l'arrivée */
  combine: boolean
  /** Étapes de l'aller (le retour fait le chemin inverse) */
  etapes: Etape[]
  /** Durée d'un aller, porte à porte, marges comprises */
  dureeAllerMin: number
  /** Aller-retour pour tout le groupe */
  total: Fourchette
  details: LigneDetail[]
  /** Option gardée mais peu réaliste (trajet simple seulement) */
  peuRealiste?: string
}

export interface OptionEcartee {
  type: TypeTrajet
  raison: string
}

export interface ResultatTrajets {
  options: OptionTrajet[]
  ecartees: OptionEcartee[]
}

export interface ParametresTrajet {
  adultes: number
  enfants: number
  /** Nuits sur place (parking de la gare ou de l'aéroport) */
  nuits: number
  av: Pick<ReglagesAvances, 'vehicules' | 'consommationL100' | 'prixCarburant' | 'peages' | 'classe' | 'bagagesSoute' | 'rayonHubMin' | 'accesGare' | 'carteReduction' | 'reservation' | 'usure'>
  saison: Saison
}

export const MODE_DU_TYPE: Record<TypeTrajet, ModeTransport> = {
  voiture: 'voiture',
  covoiturage: 'covoiturage',
  autocar: 'car',
  train: 'train',
  'voiture+train': 'train',
  'train+local': 'train',
  avion: 'avion',
  'voiture+avion': 'avion',
}

export const NOMS_TRAJETS: Record<TypeTrajet, string> = {
  voiture: 'Voiture',
  covoiturage: 'Covoiturage',
  autocar: 'Autocar',
  train: 'Train',
  'voiture+train': 'Voiture + train',
  'train+local': 'Train + transport local',
  avion: 'Avion',
  'voiture+avion': 'Voiture + avion',
}

// ---------- Fourchettes ----------

const F = (bas: number, haut: number, milieu: number): Fourchette => ({ bas, haut, milieu })
/** Prix connu à peu près (carburant, parking) : on laisse une marge autour. */
const autour = (v: number, bas = 0.9, haut = 1.15) => F(v * bas, v * haut, v)
/**
 * Prix réservable (train, avion, autocar) : selon le moment de la réservation, on garde la partie
 * de la fourchette officielle où tombent la plupart des billets (tôt : le bas, dernière minute : le haut).
 */
const selonReservation = (bas: number, haut: number, moment: Contexte['moment']) => F(bas + (haut - bas) * moment.bas, bas + (haut - bas) * moment.haut, bas + (haut - bas) * moment.milieu)
const fois = (f: Fourchette, k: number) => F(f.bas * k, f.haut * k, f.milieu * k)
const somme = (fs: Fourchette[]) => fs.reduce((a, f) => F(a.bas + f.bas, a.haut + f.haut, a.milieu + f.milieu), F(0, 0, 0))
const ZERO = F(0, 0, 0)

// ---------- Contexte ----------

interface Contexte extends ParametresTrajet {
  voyageurs: number
  /** Partie de la fourchette officielle retenue selon le moment de la réservation */
  moment: { bas: number; haut: number; milieu: number }
  /** Coût d'un km en voiture pour un véhicule (carburant + usure) */
  kmVoiture: number
}

const ROUTE = 1.3 // détour moyen sur les petits trajets routiers
const tempsRoute = (km: number) => (km / 70) * 60 + 5

const point = (c: Coordonnees): Coordonnees => ({ lat: c.lat, lon: c.lon })

// ---------- Rabattement vers une gare ou un aéroport ----------

interface Variante {
  etapes: Etape[]
  /** Voiture jusqu'au point de départ */
  voiture: boolean
  /** Long trajet en transport local à l'arrivée */
  local: boolean
}

function versHub(depuis: Coordonnees, nomDepuis: string, hub: Coordonnees & { nom: string; tc: boolean; parking: number }, aeroport: boolean, c: Contexte): Variante[] {
  const A = tarifs.acces
  const km = distanceKm(depuis, hub) * ROUTE
  const base = { de: nomDepuis, vers: hub.nom, depuis: point(depuis), jusqua: point(hub), distanceKm: km }
  if (km <= A.marcheMaxKm) return [{ voiture: false, local: false, etapes: [{ ...base, mode: 'marche', dureeMin: (km / 4.5) * 60, prix: ZERO }] }]
  const variantes: Variante[] = []
  if (hub.tc && km <= A.transportsMaxKm) {
    const ticket = aeroport ? Math.max(A.navetteAeroport.minimum, km * A.navetteAeroport.parKm) : A.ticketUrbain
    variantes.push({ voiture: false, local: false, etapes: [{ ...base, mode: 'transports', dureeMin: 15 + (km / 20) * 60, prix: autour(ticket * c.voyageurs, 0.8, 1.2), detail: aeroport ? 'Navette, RER ou tramway' : 'Bus, tramway ou métro' }] })
    return variantes
  }
  if (aeroport && hub.tc && km <= 90) {
    const ticket = Math.max(A.navetteAeroport.minimum, km * A.navetteAeroport.parKm)
    variantes.push({ voiture: false, local: false, etapes: [{ ...base, mode: 'transports', dureeMin: 20 + (km / 50) * 60, prix: autour(ticket * c.voyageurs, 0.8, 1.25), detail: 'Navette ou train jusqu’à l’aéroport' }] })
  }
  // Voiture : parking sur place, ou un proche vous dépose (il fait l'aller et le retour)
  const depose = c.av.accesGare === 'depose'
  const route = km * c.kmVoiture * c.av.vehicules * (depose ? 2 : 1)
  const etapes: Etape[] = [{ ...base, mode: 'voiture', dureeMin: tempsRoute(km), prix: autour(route), detail: depose ? 'Un proche vous dépose (aller et retour compris)' : undefined }]
  if (!depose) {
    const jours = Math.max(1, c.nuits + 1)
    etapes.push({ ...base, de: hub.nom, mode: 'parking', distanceKm: 0, dureeMin: 10, prix: autour(hub.parking * jours * c.av.vehicules, 0.6, 1.3), detail: `Parking, ${jours} jour${jours > 1 ? 's' : ''}`, uneFois: true })
  }
  variantes.push({ voiture: true, local: false, etapes })
  return variantes
}

function depuisHub(hub: Coordonnees & { nom: string; tc: boolean }, arrivee: Coordonnees, nomArrivee: string, aeroport: boolean, c: Contexte): Variante {
  const A = tarifs.acces
  const km = distanceKm(hub, arrivee) * ROUTE
  const base = { de: hub.nom, vers: nomArrivee, depuis: point(hub), jusqua: point(arrivee), distanceKm: km }
  if (km <= A.marcheMaxKm) return { voiture: false, local: false, etapes: [{ ...base, mode: 'marche', dureeMin: (km / 4.5) * 60, prix: ZERO }] }
  if (km <= A.transportsMaxKm && hub.tc) {
    const ticket = aeroport ? Math.max(A.navetteAeroport.minimum, km * A.navetteAeroport.parKm) : A.ticketUrbain
    return { voiture: false, local: false, etapes: [{ ...base, mode: 'transports', dureeMin: 15 + (km / 20) * 60, prix: autour(ticket * c.voyageurs, 0.8, 1.2), detail: aeroport ? 'Navette, métro ou bus' : 'Bus, tramway ou métro' }] }
  }
  if (hub.tc && km <= 60) {
    const ticket = aeroport ? Math.max(A.navetteAeroport.minimum, km * A.navetteAeroport.parKm) : Math.max(A.ticketUrbain, km * A.regionalParKm)
    return { voiture: false, local: !aeroport, etapes: [{ ...base, mode: 'transports', dureeMin: 20 + (km / 45) * 60, prix: autour(ticket * c.voyageurs, 0.8, 1.3), detail: aeroport ? 'Navette ou train' : 'Car régional ou TER' }] }
  }
  const taxis = Math.ceil(c.voyageurs / 4)
  return { voiture: false, local: true, etapes: [{ ...base, mode: 'taxi', dureeMin: 10 + (km / 60) * 60, prix: autour((A.taxiPriseEnCharge + km * A.taxiParKm) * taxis, 0.85, 1.3), detail: 'Taxi ou VTC (pas de transport en commun direct)' }] }
}

// ---------- Gares et tarifs SNCF ----------

const garesTgv = hubs.gares.map((g, i) => ({ g, i })).filter(({ g }) => g.tgv)

function plusProches<T extends Coordonnees>(liste: T[], p: Coordonnees, maxKm: number, n: number): { h: T; km: number }[] {
  return liste
    .map((h) => ({ h, km: distanceKm(p, h) }))
    .filter((x) => x.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, n)
}

const indexGare = new Map(hubs.gares.map((g, i) => [g, i]))
const tarif = (a: Gare, b: Gare) => {
  const i = indexGare.get(a)!
  const j = indexGare.get(b)!
  return tarifsTrain[i < j ? `${i}-${j}` : `${j}-${i}`]
}

/** Billet de train pour une personne, aller simple : tarifs SNCF si la liaison est connue, sinon prix au km. */
function billetTrain(a: Gare, b: Gare, classe: ClasseVoyage, c: Contexte): { prix: Fourchette; detail: string; tgv: boolean; officiel: boolean } {
  const t = tarif(a, b)
  const T = tarifs.train
  if (t) {
    const [oMin, oMax, iMin, iMax, aMin, aMax, , , pMin, pMax] = t
    // 1re classe : tarifs officiels ; « Business » : 1re classe avec les options (≈ +30 %)
    if (classe !== 'eco' && pMin) {
      const k = classe === 'premiere' ? 1.3 : 1
      return { prix: selonReservation(pMin * k, pMax * k, c.moment), detail: classe === 'premiere' ? 'TGV INOUI, 1re classe Business' : 'TGV INOUI, 1re classe', tgv: true, officiel: true }
    }
    const carte = c.av.carteReduction !== 'aucune' && aMin > 0
    const inoui: [number, number] | null = iMin ? (carte ? [aMin, aMax] : [iMin, iMax]) : null
    const ouigo: [number, number] | null = oMin && classe === 'eco' ? [oMin, oMax] : null
    const nomCarte = c.av.carteReduction === 'jeune' ? 'Carte Avantage Jeune' : 'Carte Avantage'
    if (inoui && ouigo) {
      return { prix: selonReservation(Math.min(inoui[0], ouigo[0]), Math.min(inoui[1], ouigo[1]), c.moment), detail: carte ? `OUIGO ou TGV INOUI (${nomCarte})` : 'OUIGO ou TGV INOUI', tgv: true, officiel: true }
    }
    if (inoui) return { prix: selonReservation(inoui[0], inoui[1], c.moment), detail: carte ? `TGV INOUI (${nomCarte})` : 'TGV INOUI', tgv: true, officiel: true }
    if (oMin) return { prix: selonReservation(oMin, oMax, c.moment), detail: 'OUIGO', tgv: true, officiel: true }
  }
  // Intercités ou TER : prix au km (la carte de réduction compte pour environ 25 %)
  const km = distanceKm(a, b) * T.detourRail
  const remise = c.av.carteReduction !== 'aucune' ? 0.75 : 1
  const coefClasse = classe === 'eco' ? 1 : classe === 'premium' ? 1.2 : 1.5
  const bas = Math.max(T.classiqueMinimum, km * T.classiqueParKm.bas) * remise * coefClasse
  const haut = Math.max(T.classiqueMinimum * 2, km * T.classiqueParKm.haut) * remise * coefClasse
  return { prix: selonReservation(bas, haut, c.moment), detail: 'Intercités ou TER (prix estimé)', tgv: false, officiel: false }
}

function etapeTrain(a: Gare, b: Gare, c: Contexte): Etape {
  const billet = billetTrain(a, b, c.av.classe, c)
  const km = distanceKm(a, b) * tarifs.train.detourRail
  const vitesse = billet.tgv ? tarifs.train.vitesseTgvKmH : tarifs.train.vitesseClassiqueKmH
  return {
    mode: 'train',
    de: a.nom,
    vers: b.nom,
    depuis: point(a),
    jusqua: point(b),
    distanceKm: km,
    dureeMin: (km / vitesse) * 60 + 10 + tarifs.train.margeMin,
    prix: fois(billet.prix, c.voyageurs),
    detail: billet.detail,
    tarifOfficiel: billet.officiel,
  }
}

/** Traversée de Paris entre deux gares (métro ou RER). */
const traverseeParis = (g: Gare, c: Contexte): Etape => ({
  mode: 'transports',
  de: 'Paris (gare d’arrivée)',
  vers: g.nom,
  depuis: point(g),
  jusqua: point(g),
  distanceKm: 5,
  dureeMin: 40,
  prix: autour(tarifs.acces.ticketUrbain * c.voyageurs, 1, 1.1),
  detail: 'Changement de gare en métro ou RER',
})

/** Grandes gares où l'on change de train (les correspondances passent par elles). */
const NOEUDS = [
  'Paris', 'Lyon Part Dieu', 'Dijon', 'Marseille Saint-Charles', 'Bordeaux Saint-Jean', 'Lille', 'Nantes', 'Rennes', 'Strasbourg', 'Toulouse Matabiau', 'Montpellier',
  'Nancy', 'Metz', 'Reims', 'Tours', 'Saint-Pierre-des-Corps', 'Le Mans', 'Poitiers', 'Angers', 'Valence', 'Avignon', 'Nîmes', 'Grenoble', 'Chambéry', 'Mulhouse',
  'Besançon', 'Clermont-Ferrand', 'Limoges', 'Orléans', 'Les Aubrais', 'Rouen', 'Caen', 'Amiens', 'Narbonne',
]
const estNoeud = (g: Gare) => NOEUDS.some((n) => g.nom.startsWith(n))

/**
 * Train sans tarif TGV connu (Intercités, TER) : seulement sur une distance raisonnable,
 * plus longue vers Paris où convergent les grandes lignes classiques.
 */
const classiquePossible = (a: Gare, b: Gare) => distanceKm(a, b) <= (a.nom.startsWith('Paris') || b.nom.startsWith('Paris') ? 300 : 200)

/** Suites de trains possibles entre deux gares : direct, ou une correspondance par une gare TGV. */
function suitesDeTrains(o: Gare, d: Gare, c: Contexte): Etape[][] {
  const suites: Etape[][] = []
  const direct = distanceKm(o, d)
  if (tarif(o, d)) return [[etapeTrain(o, d, c)]]
  if (classiquePossible(o, d)) suites.push([etapeTrain(o, d, c)])
  const maxDetour = direct * 1.3 + 30
  const correspondances = garesTgv
    .filter(({ g }) => g !== o && g !== d)
    .map(({ g }) => ({ g, km: distanceKm(o, g) + distanceKm(g, d) }))
    .filter(({ g, km }) => km <= maxDetour && estNoeud(g) && ((tarif(g, d) && (tarif(o, g) || classiquePossible(o, g))) || (tarif(o, g) && classiquePossible(g, d))))
    .sort((a, b) => a.km - b.km)
    .slice(0, 3)
  for (const { g } of correspondances) {
    const e1 = etapeTrain(o, g, c)
    const e2 = etapeTrain(g, d, c)
    suites.push(g.nom.startsWith('Paris') && !(e1.tarifOfficiel && e2.tarifOfficiel) ? [e1, traverseeParis(g, c), e2] : [e1, e2])
  }
  return suites
}

// ---------- Options par mode ----------

interface Candidat extends OptionTrajet {
  /** Étapes principales (train, avion, car) pour comparer avec le rabattement */
  principalMin: number
  rabattementMin: number
}

function assembler(type: TypeTrajet, combine: boolean, etapes: Etape[], principales: Etape[], rabattement: Etape[]): Candidat {
  const dureeAllerMin = etapes.reduce((a, e) => a + e.dureeMin, 0)
  const total = somme(etapes.map((e) => (e.uneFois ? e.prix : fois(e.prix, 2))))
  const details: LigneDetail[] = etapes
    .filter((e) => e.prix.milieu > 0)
    .map((e) => ({ libelle: libelleEtape(e), montant: e.uneFois ? e.prix.milieu : 2 * e.prix.milieu }))
  return {
    type,
    mode: MODE_DU_TYPE[type],
    combine,
    etapes,
    dureeAllerMin,
    total,
    details,
    principalMin: principales.reduce((a, e) => a + e.dureeMin, 0),
    rabattementMin: Math.max(0, ...rabattement.filter((e) => e.mode !== 'parking').map((e) => e.dureeMin)),
  }
}

export const NOMS_ETAPES: Record<ModeEtape, string> = {
  voiture: 'Voiture',
  covoiturage: 'Covoiturage',
  autocar: 'Autocar',
  train: 'Train',
  avion: 'Vol',
  transports: 'Transports en commun',
  marche: 'À pied',
  taxi: 'Taxi',
  parking: 'Parking',
}

export function libelleEtape(e: Etape): string {
  if (e.mode === 'parking') return `${e.detail ?? 'Parking'} (${e.de})`
  return `${NOMS_ETAPES[e.mode]} ${e.de} → ${e.vers}, aller-retour`
}

function optionVoiture(trajet: DonneesTrajet, c: Contexte, noms: [string, string]): Candidat | OptionEcartee {
  const v = tarifs.voiture
  if (!trajet.routeTerrestre) return { type: 'voiture', raison: 'Aucune route ne relie ces deux points (mer ou océan à traverser).' }
  const km = trajet.distanceRouteKm
  if (km > v.distanceMaxKm) return { type: 'voiture', raison: `Plus de ${v.distanceMaxKm.toLocaleString('fr-FR')} km de route : trop long en voiture.` }
  const carburant = km * (c.av.consommationL100 / 100) * c.av.prixCarburant
  const peages = c.av.peages ? km * v.partAutoroute * v.peageParKm : 0
  const usure = c.av.usure ? km * v.usureParKm : 0
  const parVehicule = carburant + peages + usure
  const detail = [`carburant ${Math.round(carburant)} €`, peages ? `péages ≈ ${Math.round(peages)} €` : 'sans péages', usure ? `usure ${Math.round(usure)} €` : ''].filter(Boolean).join(', ')
  const e: Etape = {
    mode: 'voiture',
    de: noms[0],
    vers: noms[1],
    depuis: point(trajet.depart),
    jusqua: point(trajet.arrivee),
    distanceKm: km,
    dureeMin: trajet.dureeRouteMin ?? (km / v.vitesseMoyenneKmH) * 60,
    prix: autour(parVehicule * c.av.vehicules),
    detail: `${c.av.vehicules > 1 ? `${c.av.vehicules} véhicules, ` : ''}${detail} par véhicule`,
  }
  return assembler('voiture', false, [e], [e], [])
}

function optionCovoiturage(trajet: DonneesTrajet, c: Contexte, noms: [string, string]): Candidat | OptionEcartee {
  const C = tarifs.covoiturage
  const km = trajet.distanceRouteKm
  if (!trajet.routeTerrestre) return { type: 'covoiturage', raison: 'Pas de route entre ces deux points.' }
  if (km < C.distanceMinKm) return { type: 'covoiturage', raison: 'Trajet trop court pour trouver un covoiturage.' }
  if (km > C.distanceMaxKm) return { type: 'covoiturage', raison: `Plus de ${C.distanceMaxKm.toLocaleString('fr-FR')} km : peu de conducteurs font ce trajet d’une traite.` }
  const k = (1 + C.commission) * km * c.voyageurs
  const e: Etape = {
    mode: 'covoiturage',
    de: noms[0],
    vers: noms[1],
    depuis: point(trajet.depart),
    jusqua: point(trajet.arrivee),
    distanceKm: km,
    dureeMin: (trajet.dureeRouteMin ?? (km / tarifs.voiture.vitesseMoyenneKmH) * 60) * 1.05 + C.rendezVousMin,
    prix: F(C.fourchetteParKm.bas * k, C.fourchetteParKm.haut * k, C.prixParKm * k),
    detail: `≈ ${(C.prixParKm * 100).toFixed(0)} c€/km par passager + frais de service (${Math.round(C.commission * 100)} %)`,
  }
  const option = assembler('covoiturage', false, [e], [e], [])
  if (c.voyageurs > 3) option.peuRealiste = `Trouver ${c.voyageurs} places dans la même voiture est rare.`
  return option
}

function optionsAutocar(trajet: DonneesTrajet, c: Contexte, noms: [string, string]): Candidat[] {
  const A = tarifs.car
  if (!trajet.routeTerrestre) return []
  const rayonKm = (c.av.rayonHubMin / 60) * 70 / ROUTE
  const departs = plusProches(hubs.garesRoutieres, trajet.depart, rayonKm, 3)
  const arrivees = plusProches(hubs.garesRoutieres, trajet.arrivee, 50, 2)
  const res: Candidat[] = []
  for (const { h: o } of departs)
    for (const { h: d } of arrivees) {
      if (o === d || distanceKm(o, d) < 50) continue
      const km = distanceKm(o, d) * tarifs.coefficientDetour
      if (km > A.distanceMaxKm) continue
      const borne = (v: number) => Math.min(A.plafondParTrajet, Math.max(A.minimumParTrajet, v))
      const principal: Etape = {
        mode: 'autocar',
        de: o.nom,
        vers: d.nom,
        depuis: point(o),
        jusqua: point(d),
        distanceKm: km,
        dureeMin: (km / A.vitesseMoyenneKmH) * 60 + A.margeMin,
        prix: fois(selonReservation(borne(km * A.fourchetteParKm.bas), borne(km * A.fourchetteParKm.haut), c.moment), c.voyageurs),
        detail: 'FlixBus',
      }
      const hubO = { ...o, tc: true, parking: 8 }
      for (const v of versHub(trajet.depart, noms[0], hubO, false, c)) {
        const fin = depuisHub({ ...d, tc: true }, trajet.arrivee, noms[1], false, c)
        const etapes = [...v.etapes, principal, ...fin.etapes]
        res.push(assembler('autocar', v.voiture || fin.local, etapes, [principal], [...v.etapes, ...fin.etapes]))
      }
    }
  return res
}

function optionsTrain(trajet: DonneesTrajet, c: Contexte, noms: [string, string]): Candidat[] {
  if (!trajet.routeTerrestre) return []
  const rayonKm = (c.av.rayonHubMin / 60) * 70 / ROUTE
  const unique = <T>(l: { h: T }[]) => [...new Map(l.map((x) => [x.h, x])).values()]
  const departs = unique([...plusProches(hubs.gares, trajet.depart, rayonKm, 4), ...plusProches(garesTgv.map((x) => x.g), trajet.depart, rayonKm, 4)])
  const arrivees = unique([...plusProches(hubs.gares, trajet.arrivee, 60, 3), ...plusProches(garesTgv.map((x) => x.g), trajet.arrivee, 60, 3)])
  const res: Candidat[] = []
  if (arrivees.length === 0) {
    // Destination étrangère sans gare connue : trains internationaux, prix estimé au km
    const km = trajet.distanceRouteKm
    if (km > tarifs.train.distanceMaxKm) return []
    for (const { h: o } of departs.filter((x) => x.h.tgv).slice(0, 2)) {
      const kmRail = distanceKm(o, trajet.arrivee) * tarifs.train.detourRail
      const E = tarifs.train.europeParKm
      const principal: Etape = {
        mode: 'train',
        de: o.nom,
        vers: noms[1],
        depuis: point(o),
        jusqua: point(trajet.arrivee),
        distanceKm: kmRail,
        dureeMin: (kmRail / 150) * 60 + 30 + tarifs.train.margeMin,
        prix: fois(selonReservation(Math.max(25, kmRail * E.bas), Math.max(60, kmRail * E.haut), c.moment), c.voyageurs * tarifs.train.coefficientClasse[c.av.classe]),
        detail: 'Trains internationaux, une correspondance ou plus (prix estimé)',
      }
      for (const v of versHub(trajet.depart, noms[0], o, false, c)) {
        const etapes = [...v.etapes, principal]
        res.push(assembler(v.voiture ? 'voiture+train' : 'train', v.voiture, etapes, [principal], v.etapes))
      }
    }
    return res
  }
  for (const { h: o } of departs) {
    const debuts = versHub(trajet.depart, noms[0], o, false, c)
    for (const { h: d } of arrivees) {
      if (o === d) continue
      const fin = depuisHub(d, trajet.arrivee, noms[1], false, c)
      for (const trains of suitesDeTrains(o, d, c)) {
        for (const debut of debuts) {
          const etapes = [...debut.etapes, ...trains, ...fin.etapes]
          const type: TypeTrajet = debut.voiture ? 'voiture+train' : fin.local ? 'train+local' : 'train'
          res.push(assembler(type, debut.voiture || fin.local, etapes, trains, [...debut.etapes, ...fin.etapes]))
        }
      }
    }
  }
  return res
}

/** Petits aéroports : peu de destinations, à vérifier. */
const PETITS_AEROPORTS = new Set(['XCR', 'DLE', 'BVE', 'EGC', 'TUF', 'LIG', 'LDE', 'FNI', 'BZR', 'CCF', 'LRH', 'GNB', 'CMF', 'PUF', 'CFE'])

function optionsAvion(trajet: DonneesTrajet, c: Contexte, noms: [string, string]): Candidat[] {
  const A = tarifs.avion
  if (trajet.distanceVolKm < A.distanceMinKm && trajet.routeTerrestre) return []
  const rayonKm = (c.av.rayonHubMin / 60) * 70 / ROUTE
  const utiles = hubs.aeroports.filter((a) => !PETITS_AEROPORTS.has(a.code))
  let departs = plusProches(utiles, trajet.depart, rayonKm, 4)
  // Aucun grand aéroport dans le rayon : pour un long voyage, on prend quand même les deux plus proches
  const auDela = departs.length === 0 && trajet.distanceVolKm >= 800
  if (auDela) departs = plusProches(utiles, trajet.depart, rayonKm * 2.5, 2)
  let arrivees: { h: AeroportHub; km: number }[] = plusProches(hubs.aeroports, trajet.arrivee, 100, 2)
  if (arrivees.length === 0) {
    // Aéroport inconnu : on suppose un aéroport à 25 km de la destination
    arrivees = [{ h: { code: '', nom: 'Aéroport le plus proche', lat: trajet.arrivee.lat + 0.2, lon: trajet.arrivee.lon, lowcost: false, parking: 0, tc: true, pays: '' }, km: 22 }]
  }
  const res: Candidat[] = []
  for (const { h: o } of departs)
    for (const { h: d } of arrivees) {
      const km = distanceKm(o, d)
      if (o.code === d.code || (km < A.distanceMinKm && trajet.routeTerrestre)) continue
      const base = prixAvionAllerSimple(km, c.saison) * A.coefficientClasse[c.av.classe]
      const [kb, kh] = o.lowcost && (d.lowcost || !d.code) && c.av.classe === 'eco' ? A.fourchette.lowcost : A.fourchette.classique
      const vol: Etape = {
        mode: 'avion',
        de: o.nom,
        vers: d.nom,
        depuis: point(o),
        jusqua: point(d),
        distanceKm: km,
        dureeMin: (km / A.vitesseCroisiereKmH) * 60 + 30 + A.margeMin + A.sortieMin,
        prix: fois(selonReservation(base * kb, base * kh, c.moment), c.voyageurs),
        detail: `${auDela ? 'Aéroport au-delà du temps d’accès choisi. ' : ''}2 h d’avance à l’aéroport comprises`,
        codes: [o.code, d.code],
      }
      const bagages = c.av.bagagesSoute ? autour(A.bagageSouteParTrajet * c.voyageurs, 0.7, 1.4) : null
      const fin = depuisHub(d, trajet.arrivee, noms[1], true, c)
      for (const debut of versHub(trajet.depart, noms[0], o, true, c)) {
        const etapes = [...debut.etapes, vol, ...fin.etapes]
        const option = assembler(debut.voiture ? 'voiture+avion' : 'avion', debut.voiture, etapes, [vol], [...debut.etapes, ...fin.etapes])
        if (bagages) {
          // Les bagages sont payés à l'aller et au retour, mais ne sont pas une étape du trajet
          option.total = somme([option.total, fois(bagages, 2)])
          option.details.push({ libelle: 'Bagages en soute, aller-retour', montant: 2 * bagages.milieu })
        }
        res.push(option)
      }
    }
  return res
}

// ---------- Choix ----------

/** Score d'une option selon la priorité (plus petit = meilleur). */
function score(o: { total: Fourchette; dureeAllerMin: number }, priorite: PrioriteTrajet, minPrix: number, minDuree: number): number {
  const prix = o.total.milieu / Math.max(1, minPrix)
  const duree = o.dureeAllerMin / Math.max(1, minDuree)
  if (priorite === 'prix') return prix + duree * 0.001
  if (priorite === 'rapide') return duree + prix * 0.001
  return prix + duree
}

const cache = new Map<string, { candidats: Candidat[]; ecartees: OptionEcartee[] }>()

/** Tous les trajets possibles, le meilleur de chaque type (sans filtre de priorité ni de combinaisons). */
function candidats(trajet: DonneesTrajet, p: ParametresTrajet, noms: [string, string]) {
  const cle = JSON.stringify([trajet, p, noms])
  const connu = cache.get(cle)
  if (connu) return connu
  const voyageurs = Math.max(1, p.adultes + p.enfants * tarifs.partEnfant)
  const c: Contexte = {
    ...p,
    voyageurs,
    moment: tarifs.reservation[p.av.reservation] ?? tarifs.reservation.normal,
    kmVoiture: (p.av.consommationL100 / 100) * p.av.prixCarburant + (p.av.usure ? tarifs.voiture.usureParKm : 0),
  }
  const ecartees: OptionEcartee[] = []
  const tous: Candidat[] = []
  for (const r of [optionVoiture(trajet, c, noms), optionCovoiturage(trajet, c, noms)]) {
    if ('etapes' in r) tous.push(r)
    else ecartees.push(r)
  }
  tous.push(...optionsAutocar(trajet, c, noms), ...optionsTrain(trajet, c, noms), ...optionsAvion(trajet, c, noms))

  // Options absurdes : détour > 30 %, rabattement plus long que le trajet principal
  const direct = trajet.distanceVolKm
  const valides = tous.filter((o) => {
    if (!o.combine) return true
    const parcouru = o.etapes.filter((e) => e.mode !== 'parking').reduce((a, e) => a + distanceKm(e.depuis, e.jusqua), 0)
    if (parcouru > direct * 1.3 + 15) return note(o.type, 'détour de plus de 30 % par la gare ou l’aéroport')
    if (o.rabattementMin > o.principalMin) return note(o.type, 'trajet jusqu’à la gare ou l’aéroport plus long que le trajet principal')
    return true
  })
  function note(type: TypeTrajet, raison: string) {
    if (!ecartees.some((e) => e.type === type)) ecartees.push({ type, raison: `Écarté : ${raison}.` })
    return false
  }
  const resultat = { candidats: valides, ecartees }
  if (cache.size > 60) cache.delete(cache.keys().next().value!)
  cache.set(cle, resultat)
  return resultat
}

/**
 * Comparatif des trajets : le meilleur trajet de chaque type selon la priorité.
 * Sans combinaisons, on ne garde que les trajets simples (pas de voiture jusqu'à la gare).
 * Les trajets plus de deux fois plus longs que le plus rapide sont écartés (combinés)
 * ou signalés (trajets simples, que l'on peut vouloir quand même).
 */
export function comparerTrajets(trajet: DonneesTrajet, p: ParametresTrajet, options: { priorite: PrioriteTrajet; combinaisons: boolean; noms?: [string, string] }): ResultatTrajets {
  const { candidats: tous, ecartees: ecarteesBrutes } = candidats(trajet, p, options.noms ?? ['Départ', 'Arrivée'])
  const ecartees = [...ecarteesBrutes]
  const permis = tous.filter((o) => options.combinaisons || !o.combine)
  if (!options.combinaisons && tous.some((o) => o.combine && !permis.some((x) => x.type === o.type)))
    for (const t of new Set(tous.filter((o) => o.combine).map((o) => o.type)))
      if (!permis.some((x) => x.type === t)) ecartees.push({ type: t, raison: 'Trajet combiné : autorisez les combinaisons pour le voir.' })
  if (permis.length === 0) return { options: [], ecartees }
  const minPrix = Math.min(...permis.map((o) => o.total.milieu))
  const minDuree = Math.min(...permis.map((o) => o.dureeAllerMin))
  const meilleurs = new Map<TypeTrajet, Candidat>()
  for (const o of permis) {
    const actuel = meilleurs.get(o.type)
    if (!actuel || score(o, options.priorite, minPrix, minDuree) < score(actuel, options.priorite, minPrix, minDuree)) meilleurs.set(o.type, o)
  }
  const plusRapide = Math.min(...[...meilleurs.values()].map((o) => o.dureeAllerMin))
  const resultat: OptionTrajet[] = []
  for (const o of meilleurs.values()) {
    const { principalMin: _p, rabattementMin: _r, ...option } = o
    if (o.dureeAllerMin > 2 * plusRapide) {
      if (o.combine) {
        ecartees.push({ type: o.type, raison: 'Écarté : plus de deux fois plus long que le trajet le plus rapide.' })
        continue
      }
      option.peuRealiste ??= 'Plus de deux fois plus long que le trajet le plus rapide.'
    }
    resultat.push(option)
  }
  resultat.sort((a, b) => score(a, options.priorite, minPrix, minDuree) - score(b, options.priorite, minPrix, minDuree))
  return { options: resultat, ecartees: ecartees.filter((e) => !resultat.some((o) => o.type === e.type)) }
}

/**
 * Trajet retenu pour un mode : celui choisi dans le comparatif s'il est de ce mode,
 * sinon le meilleur de ce mode selon la priorité (les trajets peu réalistes passent en dernier).
 */
export function trajetPourMode(r: ResultatTrajets, mode: ModeTransport, choisi: TypeTrajet | null): OptionTrajet | undefined {
  const duMode = r.options.filter((o) => o.mode === mode)
  return duMode.find((o) => o.type === choisi) ?? duMode.find((o) => !o.peuRealiste) ?? duMode[0]
}

/** « 3 h 05 » */
export function formatDuree(min: number): string {
  const m = Math.round(min / 5) * 5
  const h = Math.floor(m / 60)
  return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}
