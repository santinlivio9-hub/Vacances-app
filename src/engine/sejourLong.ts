import { donneesPays, prixBase } from '../data'
import type { ReglagesSimples, TransportLocal, TypeLogement } from '../domain/types'
import { saisonDuMois } from './apercu'
import { equivalentsRepas, type EntreeCouts } from './couts'
import { moisDe } from './dates'
import { LOGEMENTS } from './logements'
import { reglagesEffectifs } from './reglages'
import { villeProche } from './villes'
export { villeProche }
import { estimerTransport, MODES, type EstimationTransport, type LigneDetail } from './transport'

export type IdZone = 'proche' | 'moyenne' | 'eloignee'
export type PosteMensuel = 'loyer' | 'trajets' | 'courses' | 'sorties' | 'retours' | 'divers'
export const POSTES_MENSUELS: PosteMensuel[] = ['loyer', 'trajets', 'courses', 'sorties', 'retours', 'divers']

/** Zone de logement autour du lieu de travail, selon le temps de trajet. */
export interface ZoneLogement {
  id: IdZone
  nom: string
  /** Anneau entre deux distances du lieu de travail (km) */
  rayonMinKm: number
  rayonMaxKm: number
  mode: TransportLocal
  /** Temps de trajet maximum dans la zone (aller) */
  minutes: number
  coefLoyer: number
  /** Coût mensuel du trajet domicile-travail, par personne qui travaille */
  coutTrajetMois: number
  description: string
}

/** Distance atteinte en un temps donné, par mode (cercles sur la carte). */
export interface CercleTrajet {
  mode: TransportLocal
  rayonKm: number
  minutes: number
}

export interface BudgetSejourLong {
  /** Durée en mois (décimale) et en semaines */
  mois: number
  semaines: number
  logement: TypeLogement
  zone: ZoneLogement
  zones: ZoneLogement[]
  cercles: CercleTrajet[]
  ville: { nom: string; coef: number; connue: boolean }
  parMois: Record<PosteMensuel, number>
  details: Record<PosteMensuel, LigneDetail[]>
  totalMensuel: number
  /** Dépenses faites une seule fois */
  ponctuel: { voyage: number; installation: number }
  /** Somme des dépenses ponctuelles */
  fraisPonctuels: number
  /** À avancer, remboursé à la fin : pas une dépense, donc hors du total */
  depotGarantie: number
  /** Coût d'un aller-retour chez soi et mode le moins cher retenu */
  retour: { prix: number; mode: string | null; parMois: number }
  transport: EstimationTransport
  /** Total des dépenses = totalMensuel × mois + frais ponctuels */
  total: number
  gratification: Gratification
  /** Dépenses − gratification (négatif : excédent) */
  resteAChargeMois: number
  resteAChargeTotal: number
  parPersonne: number
  avertissements: string[]
}

/**
 * Gratification minimale des stages en France, 2026 : 15 % du plafond horaire de la Sécurité sociale
 * (30 € en 2026), soit 4,50 € par heure de présence. Obligatoire au-delà de 2 mois de présence,
 * c'est-à-dire plus de 44 jours de 7 heures, soit plus de 308 heures (consécutives ou non).
 * Source : service-public.fr (fiche F32131), vérifiée le 24/11/2026.
 */
export const GRATIFICATION = { tauxHoraire: 4.5, seuilHeures: 308, annee: 2026 }

export interface Gratification {
  mode: 'legale' | 'personnalisee' | 'aucune'
  /** Vrai si la présence dépasse 2 mois (308 heures) : la gratification est alors obligatoire */
  obligatoire: boolean
  joursPresence: number
  heuresParJour: number
  heures: number
  /** Montant légal minimum pour cette présence */
  minimumLegal: number
  parMois: number
  total: number
}

const minutes = (h: string) => {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + (mm || 0)
}

/** Heures de présence par jour : de l'arrivée au départ, moins une heure de pause au-delà de 6 heures. */
export function heuresParJour(heureDebut: string, heureFin: string): number {
  const brut = Math.max(0, minutes(heureFin) - minutes(heureDebut)) / 60
  return Math.min(12, brut > 6 ? brut - 1 : brut)
}

/** Jours de présence entre deux dates incluses : les `joursParSemaine` premiers jours de chaque semaine (lundi d'abord). */
export function joursDePresence(debut: string, fin: string, joursParSemaine: number): number {
  let n = 0
  const d = new Date(`${debut}T12:00:00Z`)
  const f = new Date(`${fin}T12:00:00Z`)
  while (d <= f) {
    const rang = (d.getUTCDay() + 6) % 7 // lundi = 0
    if (rang < joursParSemaine) n++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return n
}

/** Gratification du stage, d'après les dates, les jours travaillés et les horaires. */
export function gratificationStage(stage: ReglagesSimples['stage'], dateDebut: string, mois: number): Gratification {
  const joursPresence = joursDePresence(dateDebut, stage.dateFin, stage.joursParSemaine)
  const hj = heuresParJour(stage.heureDebut, stage.heureFin)
  const heures = joursPresence * hj
  const obligatoire = heures > GRATIFICATION.seuilHeures
  const minimumLegal = heures * GRATIFICATION.tauxHoraire
  const total = stage.gratification === 'aucune' ? 0 : stage.gratification === 'personnalisee' ? stage.gratificationMois * mois : minimumLegal
  return { mode: stage.gratification, obligatoire, joursPresence, heuresParJour: hj, heures, minimumLegal, parMois: total / mois, total }
}

const JOURS_PAR_MOIS = 30.44
const SEMAINES_PAR_MOIS = JOURS_PAR_MOIS / 7
const RETOURS_PAR_MOIS = { jamais: 0, deux: SEMAINES_PAR_MOIS / 2, chaque: SEMAINES_PAR_MOIS }

/** Ville connue la plus proche (à moins de 25 km), pour le niveau des loyers et le prix de l'abonnement. */

/** Distance parcourue en `minutes` (aller), selon le mode. */
export const rayonPour = (mode: TransportLocal, minutes: number) => (prixBase.sejourLong.vitessesKmH[mode] * minutes) / 60

/**
 * Trois anneaux autour du lieu de travail :
 * - tout près : à pied (au plus 20 min), sans frais de trajet, loyers plus chers ;
 * - proche : en vélo ou en transports dans le temps accepté ;
 * - plus loin : jusqu'au temps maximum en transports (ou en voiture), loyers plus bas.
 */
export function zonesTrajet(trajetMaxMin: number, contexte: { abonnement: number; remboursement: boolean }): ZoneLogement[] {
  const SL = prixBase.sejourLong
  const max = Math.max(15, trajetMaxMin)
  const pied = Math.min(20, max)
  const rPied = rayonPour('pied', pied)
  const abonnement = contexte.abonnement * (contexte.remboursement ? 0.5 : 1)
  const rMoyen = Math.max(rPied + 0.5, rayonPour('transports', Math.min(max, 30)))
  const zones: ZoneLogement[] = [
    {
      id: 'proche',
      nom: 'Tout près',
      rayonMinKm: 0,
      rayonMaxKm: rPied,
      mode: 'pied',
      minutes: pied,
      coefLoyer: SL.coefZone.proche,
      coutTrajetMois: 0,
      description: `À moins de ${pied} min à pied : pas de frais de trajet, mais des loyers plus chers.`,
    },
    {
      id: 'moyenne',
      nom: 'Proche en transports',
      rayonMinKm: rPied,
      rayonMaxKm: rMoyen,
      mode: 'transports',
      minutes: Math.min(max, 30),
      coefLoyer: SL.coefZone.moyenne,
      coutTrajetMois: abonnement,
      description: `Moins de ${Math.min(max, 30)} min en transports en commun (ou à vélo).`,
    },
  ]
  if (max > 30) {
    const rLoin = rayonPour('transports', max)
    zones.push({
      id: 'eloignee',
      nom: 'Plus loin',
      rayonMinKm: rMoyen,
      rayonMaxKm: rLoin,
      mode: 'transports',
      minutes: max,
      coefLoyer: SL.coefZone.eloignee,
      coutTrajetMois: abonnement,
      description: `Jusqu’à ${max} min de trajet : les loyers les plus bas.`,
    })
  }
  return zones
}

export interface EntreeSejourLong extends EntreeCouts {
  logement?: TypeLogement
  zone?: IdZone
}

/**
 * Budget d'un stage ou d'un séjour long : loyer, trajets domicile-travail, courses, sorties,
 * allers-retours chez soi le week-end et petites dépenses, par mois ; plus le voyage
 * aller-retour et les frais d'installation, une seule fois.
 */
export function budgetSejourLong(entree: EntreeSejourLong): BudgetSejourLong {
  const { trajet, arrivee, reglages } = entree
  const s = reglages.simple
  const av = reglagesEffectifs(reglages)
  const SL = prixBase.sejourLong
  const st = s.style
  const pays = donneesPays(arrivee.pays, arrivee)
  const k = pays.indice
  const avertissements: string[] = []
  if (pays.estimationContinent) avertissements.push('Pays absent de notre base : prix estimés d’après la moyenne de la région.')

  const mois = Math.max(0.25, s.nuits / JOURS_PAR_MOIS)
  const semaines = s.nuits / 7
  const proche = villeProche(arrivee)
  const coefVille = proche?.loyer ?? SL.petiteVille
  const abonnement = proche?.abonnement ?? SL.abonnementTransportMois * k
  const zones = zonesTrajet(s.stage.trajetMaxMin, { abonnement, remboursement: av.remboursementTransport })
  const zone = zones.find((z) => z.id === (entree.zone ?? s.stage.zone)) ?? zones.find((z) => z.id === 'moyenne')!
  // Même logement que partout ailleurs (configuration, propositions, Mon voyage) : celui des réglages effectifs
  const logement = entree.logement ?? av.typeLogement
  const occupants = s.adultes + s.enfants
  const equivalentsAdultes = equivalentsRepas(s)

  // Loyer
  const loyerBase = SL.loyerMensuel[logement][st] * (1 + SL.occupantSupplementaire[logement] * Math.max(0, occupants - 1))
  const loyer = loyerBase * k * coefVille * zone.coefLoyer
  // Trajets domicile-travail (chaque adulte travaille ou étudie)
  const trajets = zone.coutTrajetMois * s.adultes
  // Courses (cuisine dans tous les logements au mois) et sorties
  const courses = SL.coursesMois[st] * k * equivalentsAdultes
  const sorties = SL.sortiesMois[st] * k * equivalentsAdultes * (av.activitesWeekend ? 1 : 0.6)
  // Allers-retours chez soi : le mode le moins cher possible, pour une personne
  const saison = saisonDuMois(pays, moisDe(s.dateDepart))
  const unePersonne = { adultes: 1, enfants: 0 }
  const avRetour = { ...av, vehicules: 1, classe: 'eco' as const, bagagesSoute: false }
  const possibles = MODES.map((m) => estimerTransport(m, trajet, unePersonne, avRetour, saison)).filter((t) => t.possible)
  // Les trajets peu réalistes (deux fois plus longs que le plus rapide) ne servent que s'il n'y a rien d'autre
  const realistes = possibles.filter((t) => !t.option?.peuRealiste)
  const modesRetour = realistes.length ? realistes : possibles
  const retourMoinsCher = modesRetour.sort((a, b) => a.total - b.total)[0]
  const parRetour = retourMoinsCher?.total ?? 0
  const nbRetours = RETOURS_PAR_MOIS[s.stage.retours]
  const retours = parRetour * nbRetours * s.adultes
  if (nbRetours > 0 && retourMoinsCher && retourMoinsCher.dureeAllerMin > 6 * 60) avertissements.push('Rentrer chez soi le week-end prend plus de 6 heures par trajet : pensez à espacer les retours.')
  // Petites dépenses (téléphone, hygiène, assurance habitation…)
  const divers = SL.diversMois[st] * k * s.adultes
  const imprevusTaux = av.tauxImprevus

  const parMois: Record<PosteMensuel, number> = { loyer, trajets, courses, sorties, retours, divers }
  const sousTotal = Object.values(parMois).reduce((a, b) => a + b, 0)
  parMois.divers += sousTotal * imprevusTaux
  const totalMensuel = sousTotal * (1 + imprevusTaux)

  // Une seule fois : voyage aller-retour du groupe et installation
  const transport = estimerTransport(s.transport, trajet, s, av, saison)
  if (!transport.possible && transport.raison) avertissements.push(transport.raison)
  const installation = SL.installation[logement] * k
  const ponctuel = { voyage: transport.total, installation }
  const fraisPonctuels = ponctuel.voyage + ponctuel.installation
  const total = totalMensuel * mois + fraisPonctuels
  // Dépôt de garantie : un mois de loyer hors charges (≈ 90 % du loyer) pour un bail ; rien chez l'habitant ou sur Airbnb
  const depotGarantie = ['studio', 'colocation', 'residence'].includes(logement) ? Math.round(loyer * 0.9) : 0
  const gratification = gratificationStage(s.stage, s.dateDepart, mois)
  const NOMS_RETOUR: Record<string, string> = { voiture: 'en voiture', train: 'en train', avion: 'en avion', car: 'en car' }

  const MODES_NOMS = { pied: 'À pied', velo: 'À vélo', transports: 'Abonnement de transports', voiture: 'En voiture' }
  const details: Record<PosteMensuel, LigneDetail[]> = {
    loyer: [{ libelle: `${LOGEMENTS[logement].nom}, zone « ${zone.nom.toLowerCase()} »${proche ? ` (${proche.nom})` : ''}, charges comprises`, montant: loyer }],
    trajets: [{ libelle: zone.coutTrajetMois === 0 ? 'Trajets à pied' : `${MODES_NOMS[zone.mode]}${av.remboursementTransport ? ', remboursé à 50 % par l’employeur' : ''}`, montant: trajets }],
    courses: [{ libelle: 'Courses et repas à la maison', montant: courses }],
    sorties: [{ libelle: av.activitesWeekend ? 'Sorties et activités du week-end' : 'Sorties', montant: sorties }],
    retours: [
      {
        libelle: nbRetours
          ? `${s.stage.retours === 'chaque' ? 'Chaque week-end' : 'Un week-end sur deux'} : ${nbRetours.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} allers-retours par mois × ${Math.round(parRetour)} €${retourMoinsCher ? ` (${NOMS_RETOUR[retourMoinsCher.mode]}, le moins cher)` : ''}`
          : 'Pas de retour prévu',
        montant: retours,
      },
    ],
    divers: [
      { libelle: 'Téléphone, hygiène, assurance habitation', montant: divers },
      { libelle: `Marge pour imprévus (${Math.round(imprevusTaux * 100)} %)`, montant: sousTotal * imprevusTaux },
    ],
  }

  return {
    mois,
    semaines,
    logement,
    zone,
    zones,
    cercles: (['pied', 'velo', 'transports', 'voiture'] as TransportLocal[]).map((m) => ({ mode: m, minutes: s.stage.trajetMaxMin, rayonKm: rayonPour(m, s.stage.trajetMaxMin) })),
    ville: { nom: proche?.nom ?? 'ville moyenne', coef: coefVille, connue: !!proche },
    parMois,
    details,
    totalMensuel,
    ponctuel,
    fraisPonctuels,
    depotGarantie,
    retour: { prix: parRetour, mode: retourMoinsCher?.mode ?? null, parMois: nbRetours },
    transport,
    total,
    gratification,
    resteAChargeMois: totalMensuel - gratification.parMois,
    resteAChargeTotal: total - gratification.total,
    parPersonne: total / Math.max(1, occupants),
    avertissements,
  }
}
