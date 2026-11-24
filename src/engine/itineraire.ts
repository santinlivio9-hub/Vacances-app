import { prixBase } from '../data'
import type { ActivitePlanifiee, Coordonnees, Itineraire, JourItineraire, LieuVisite, ModeTransport, Reglages, TypeActivite } from '../domain/types'
import { generateur } from './aleatoire'
import { TYPES_PAR_INTERET } from './couts'
import { ajouterJours } from './dates'
import { distanceKm } from './geo'
import { reglagesEffectifs } from './reglages'

export interface EntreeItineraire {
  lieux: LieuVisite[]
  source: Itineraire['source']
  centre: Coordonnees
  /** Nom de la destination, pour les activités génériques */
  ville: string
  reglages: Reglages
  /** Coût de la vie à destination (France = 1) */
  indice: number
  mode: ModeTransport
  /** Durée d'un aller, porte à porte */
  dureeAllerMin: number
  graine: number
}

const HEURES = { matin: '9 h 30', 'apres-midi': '14 h 30', soir: '18 h 30' } as const
const MOMENTS = ['matin', 'apres-midi', 'soir'] as const

/** Activités de secours quand aucun service n'a trouvé de lieux. */
/** « de Paris », « d’Annecy », « du Havre » n'est pas géré (rare) */
export const deVille = (ville: string) => (/^[aeiouyàâäéèêëîïôöûùüœh]/i.test(ville) ? `d’${ville}` : `de ${ville}`)

export function activitesGeneriques(ville: string, centre: Coordonnees): LieuVisite[] {
  const g = (id: string, nom: string, type: TypeActivite, dLat = 0, dLon = 0): LieuVisite => ({
    id: `gen-${id}`,
    nom,
    type,
    lat: centre.lat + dLat,
    lon: centre.lon + dLon,
    gratuit: prixBase.activites[type].equilibre === 0,
    source: 'generique',
  })
  return [
    g('centre', `Balade dans le centre ${deVille(ville)}`, 'monument'),
    g('marche', `Marché local ${deVille(ville)}`, 'marche', 0.004, -0.003),
    g('musee', `Musée principal ${deVille(ville)}`, 'musee', -0.003, 0.004),
    g('parc', `Parc ou jardin ${deVille(ville)}`, 'parc', 0.006, 0.006),
    g('vue', `Point de vue sur ${ville}`, 'point_de_vue', -0.008, -0.006),
    g('visite', `Visite guidée ${deVille(ville)}`, 'visite_guidee', 0.001, 0.001),
    g('nature', `Escapade nature autour ${deVille(ville)}`, 'nature', 0.03, -0.02),
    g('spectacle', `Soirée spectacle à ${ville}`, 'spectacle', -0.002, -0.002),
    g('vieille-ville', `Quartier historique ${deVille(ville)}`, 'monument', -0.005, 0.002),
    g('art', `Musée d’art ou galerie à ${ville}`, 'musee', 0.003, -0.006),
    g('eau', `Promenade au bord de l’eau à ${ville}`, 'nature', -0.01, 0.01),
    g('gourmand', `Balade gourmande et produits locaux à ${ville}`, 'visite_guidee', 0.002, -0.001),
    g('monument', `Monument emblématique ${deVille(ville)}`, 'monument', 0.0015, 0.0035),
    g('coucher', `Coucher de soleil sur ${ville}`, 'point_de_vue', -0.006, 0.008),
    g('quartiers', `Découverte d’un quartier moins touristique ${deVille(ville)}`, 'autre', 0.012, -0.01),
    g('excursion', `Excursion d’une journée aux environs de ${ville}`, 'visite_guidee', 0.05, 0.04),
  ]
}

/** Prix d'une activité pour le groupe, d'après son type, le style et le pays. */
export function prixActivite(lieu: LieuVisite, reglages: Reglages, indice: number): number {
  if (lieu.gratuit) return 0
  const s = reglages.simple
  const unitaire = prixBase.activites[lieu.type][s.style] * indice
  return unitaire * (s.adultes + s.enfants * prixBase.divers.partEnfant)
}

/** Note d'un lieu : intérêts, notoriété, distance au centre, et une petite part de hasard (graine). */
export function noterLieu(lieu: LieuVisite, entree: Pick<EntreeItineraire, 'reglages' | 'centre'>, alea: number): number {
  const av = reglagesEffectifs(entree.reglages)
  const interets = entree.reglages.simple.interets
  let note = 1
  if (interets.some((i) => TYPES_PAR_INTERET[i].includes(lieu.type))) note += 2
  if (av.activitesIncluses.includes(lieu.type)) note += 2.5
  if (lieu.wikidata || lieu.wikipedia) note += 1.5
  if (lieu.type === 'autre') note -= 0.5
  note -= Math.min(2, distanceKm(entree.centre, lieu) / 6)
  return note + alea * 1.2
}

/** Lieux admissibles selon les filtres du mode Avancé. */
function filtrer(lieux: LieuVisite[], entree: EntreeItineraire): LieuVisite[] {
  const av = reglagesEffectifs(entree.reglages)
  return lieux.filter((l) => {
    if (av.activitesExclues.includes(l.type)) return false
    const prixUnitaire = l.gratuit ? 0 : prixBase.activites[l.type][entree.reglages.simple.style] * entree.indice
    if (av.gratuitesUniquement && prixUnitaire > 0) return false
    if (av.budgetMaxActivite != null && prixUnitaire > av.budgetMaxActivite) return false
    return true
  })
}

/** Coordonnées planes (km) pour regrouper les lieux proches. */
const plan = (p: Coordonnees, ref: Coordonnees) => [(p.lon - ref.lon) * 111 * Math.cos((ref.lat * Math.PI) / 180), (p.lat - ref.lat) * 111] as const

/**
 * K-moyennes à graine fixe : regroupe les lieux en `k` groupes géographiques.
 * Renvoie l'indice du groupe de chaque lieu.
 */
export function kMoyennes(points: Coordonnees[], k: number, aleatoire: () => number, iterations = 12): number[] {
  if (points.length === 0) return []
  const n = Math.min(k, points.length)
  const ref = points[0]
  const xy = points.map((p) => plan(p, ref))
  const d2 = (a: readonly number[], b: readonly number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
  // Initialisation k-means++ (reproductible grâce au générateur)
  const centres = [xy[Math.floor(aleatoire() * xy.length)]]
  while (centres.length < n) {
    const poids = xy.map((p) => Math.min(...centres.map((c) => d2(p, c))))
    const somme = poids.reduce((a, b) => a + b, 0)
    let r = aleatoire() * somme
    let i = 0
    while (i < poids.length - 1 && r > poids[i]) r -= poids[i++]
    centres.push(xy[somme > 0 ? i : centres.length % xy.length])
  }
  let groupes = new Array<number>(xy.length).fill(0)
  for (let it = 0; it < iterations; it++) {
    groupes = xy.map((p) => centres.reduce((meilleur, c, j) => (d2(p, c) < d2(p, centres[meilleur]) ? j : meilleur), 0))
    for (let j = 0; j < centres.length; j++) {
      const membres = xy.filter((_, i) => groupes[i] === j)
      if (membres.length) centres[j] = [membres.reduce((s, p) => s + p[0], 0) / membres.length, membres.reduce((s, p) => s + p[1], 0) / membres.length]
    }
  }
  return groupes
}

/** Ordonne des lieux par « plus proche voisin » à partir d'un point. */
function ordonner(lieux: LieuVisite[], depart: Coordonnees): LieuVisite[] {
  const reste = [...lieux]
  const ordre: LieuVisite[] = []
  let ici = depart
  while (reste.length) {
    let i = 0
    for (let j = 1; j < reste.length; j++) if (distanceKm(ici, reste[j]) < distanceKm(ici, reste[i])) i = j
    ici = reste[i]
    ordre.push(...reste.splice(i, 1))
  }
  return ordre
}

/** Spectacles et couchers de soleil : en soirée. */
const estDuSoir = (lieu: LieuVisite) => lieu.type === 'spectacle' || /coucher de soleil|sunset/i.test(lieu.nom)

const heureTexte = (minutes: number) => {
  const m = Math.round(minutes / 30) * 30
  const h = Math.floor(m / 60)
  return m % 60 ? `${h} h 30` : `${h} h`
}

/** Nombre d'activités prévues chaque jour : arrivée et départ allégés, rythme, temps libre. */
export function capacites(nuits: number, rythme: 1 | 2 | 3, tempsLibre: boolean, longTrajet = false): { type: JourItineraire['type']; places: number }[] {
  const jours = nuits + 1
  return Array.from({ length: jours }, (_, i) => {
    if (i === 0) return { type: 'arrivee' as const, places: rythme >= 2 && !longTrajet ? 1 : 0 }
    if (i === jours - 1) return { type: 'depart' as const, places: rythme >= 2 && nuits >= 2 ? 1 : 0 }
    if (tempsLibre && i % 3 === 0) return { type: 'libre' as const, places: 1 }
    return { type: 'plein' as const, places: rythme }
  })
}

/**
 * Itinéraire jour par jour : choisit les meilleurs lieux, les regroupe par proximité
 * (un quartier par jour), allège le premier et le dernier jour. Déterministe pour une graine donnée.
 */
export function genererItineraire(entree: EntreeItineraire): Itineraire {
  const s = entree.reglages.simple
  const av = reglagesEffectifs(entree.reglages)
  const aleatoire = generateur(entree.graine)
  const jours = capacites(s.nuits, av.rythme, av.tempsLibre, entree.dureeAllerMin > 9 * 60)
  const places = jours.reduce((t, j) => t + j.places, 0)

  // 1. Sélection : lieux trouvés, complétés par des activités génériques si besoin
  let candidats = filtrer(entree.lieux, entree)
  if (candidats.length < places) {
    const generiques = filtrer(activitesGeneriques(entree.ville, entree.centre), entree)
    candidats = [...candidats, ...generiques.filter((g) => !candidats.some((c) => c.nom === g.nom))]
  }
  const notes = new Map(candidats.map((l) => [l.id, noterLieu(l, entree, aleatoire())]))
  const choisis = [...candidats].sort((a, b) => notes.get(b.id)! - notes.get(a.id)!).slice(0, places)

  // 2. Regroupement : un groupe par jour qui a des activités, puis remplissage dans l'ordre des groupes
  const joursActifs = jours.filter((j) => j.places > 0).length
  const groupes = kMoyennes(choisis, Math.max(1, joursActifs), aleatoire)
  const parGroupe = new Map<number, LieuVisite[]>()
  choisis.forEach((l, i) => parGroupe.set(groupes[i], [...(parGroupe.get(groupes[i]) ?? []), l]))
  const groupesTries = [...parGroupe.values()].sort((a, b) => b.length - a.length)
  const file = groupesTries.flatMap((g) => ordonner(g, entree.centre))

  // 3. Placement jour par jour
  const allerH = entree.dureeAllerMin / 60
  const departConseille = Math.max(6 * 60, Math.min(12 * 60, 14 * 60 - entree.dureeAllerMin))
  const resultat: JourItineraire[] = jours.map((j, index) => {
    const lieux = ordonner(file.splice(0, j.places), entree.centre)
    const momentsDispo = j.type === 'arrivee' ? (['soir'] as const) : j.type === 'depart' ? (['matin'] as const) : j.type === 'libre' ? (['matin'] as const) : MOMENTS.slice(0, j.places)
    const activites: ActivitePlanifiee[] = lieux.map((lieu, k) => {
      const moment = estDuSoir(lieu) && j.type !== 'depart' ? 'soir' : momentsDispo[Math.min(k, momentsDispo.length - 1)]
      return { lieu, moment, heure: HEURES[moment], prix: prixActivite(lieu, entree.reglages, entree.indice) }
    })
    activites.sort((a, b) => MOMENTS.indexOf(a.moment) - MOMENTS.indexOf(b.moment))

    const notesJour: string[] = []
    let titre: string
    if (j.type === 'arrivee') {
      titre = `Arrivée à ${entree.ville}`
      notesJour.push(
        allerH > 9
          ? `Long trajet (≈ ${Math.round(allerH)} h) : arrivée en fin de journée, gardez la soirée pour vous reposer.`
          : `Départ conseillé vers ${heureTexte(departConseille)} pour arriver en début d’après-midi.`,
      )
    } else if (j.type === 'depart') {
      titre = 'Dernière matinée et retour'
      notesJour.push(`Libérez le logement vers 11 h ; départ conseillé vers ${heureTexte(Math.max(13 * 60, 20 * 60 - entree.dureeAllerMin))}.`)
    } else if (j.type === 'libre') {
      titre = 'Matinée de visite, après-midi libre'
      notesJour.push('Après-midi libre : flânerie, repos ou découverte au hasard.')
    } else {
      const principal = activites.find((a) => a.lieu.source !== 'generique')?.lieu.nom
      titre = principal ? `${principal} et alentours` : activites.length ? `Découverte ${deVille(entree.ville)}` : 'Journée libre'
    }
    if (j.type !== 'depart' && j.type !== 'arrivee' && activites.length < j.places) notesJour.push('Peu de lieux trouvés ici : profitez-en pour explorer librement.')
    return { index, date: ajouterJours(s.dateDepart, index), titre, type: j.type, activites, notes: notesJour }
  })

  return {
    jours: resultat,
    totalActivites: resultat.reduce((t, j) => t + j.activites.reduce((u, a) => u + a.prix, 0), 0),
    source: entree.lieux.length ? entree.source : 'aucun',
    graine: entree.graine,
  }
}

/**
 * Remplace une activité par le meilleur lieu non utilisé, proche des autres activités du jour.
 * Renvoie l'itinéraire inchangé s'il n'y a plus d'autre lieu.
 */
export function remplacerActivite(itineraire: Itineraire, jour: number, position: number, entree: EntreeItineraire): Itineraire {
  const j = itineraire.jours[jour]
  const actuelle = j?.activites[position]
  if (!actuelle) return itineraire
  const utilises = new Set(itineraire.jours.flatMap((d) => d.activites.map((a) => a.lieu.id)))
  const autres = j.activites.filter((_, i) => i !== position).map((a) => a.lieu)
  const repere = autres.length ? { lat: autres.reduce((s, l) => s + l.lat, 0) / autres.length, lon: autres.reduce((s, l) => s + l.lon, 0) / autres.length } : actuelle.lieu
  const aleatoire = generateur(entree.graine * 31 + jour * 7 + position + utilises.size)
  const candidats = [...filtrer(entree.lieux, entree), ...filtrer(activitesGeneriques(entree.ville, entree.centre), entree)]
    .filter((l) => !utilises.has(l.id))
    .map((l) => ({ l, note: noterLieu(l, { ...entree, centre: repere }, aleatoire()) }))
    .sort((a, b) => b.note - a.note)
  const nouveau = candidats[0]?.l
  if (!nouveau) return itineraire
  const activites = j.activites.map((a, i) => (i === position ? { ...a, lieu: nouveau, prix: prixActivite(nouveau, entree.reglages, entree.indice) } : a))
  const jours = itineraire.jours.map((d, i) => (i === jour ? { ...d, activites } : d))
  return { ...itineraire, jours, totalActivites: jours.reduce((t, d) => t + d.activites.reduce((u, a) => u + a.prix, 0), 0) }
}
