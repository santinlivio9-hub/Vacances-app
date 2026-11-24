import { donneesPays, prixBase, villes, type Ville } from '../data'
import type { Coordonnees, TransportLocal, TypeLogement } from '../domain/types'
import { saisonDuMois } from './apercu'
import type { EntreeCouts } from './couts'
import { moisDe } from './dates'
import { distanceKm } from './geo'
import { LOGEMENTS } from './logements'
import { reglagesEffectifs } from './reglages'
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
  transport: EstimationTransport
  total: number
  parPersonne: number
  avertissements: string[]
}

const JOURS_PAR_MOIS = 30.44
const SEMAINES_PAR_MOIS = JOURS_PAR_MOIS / 7
const RETOURS_PAR_MOIS = { jamais: 0, deux: SEMAINES_PAR_MOIS / 2, chaque: SEMAINES_PAR_MOIS }

/** Ville connue la plus proche (à moins de 25 km), pour le niveau des loyers et le prix de l'abonnement. */
export function villeProche(p: Coordonnees): Ville | null {
  let meilleure: Ville | null = null
  let d = 25
  for (const v of villes) {
    const dv = distanceKm(p, v)
    if (dv < d) {
      d = dv
      meilleure = v
    }
  }
  return meilleure
}

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
  const logement = entree.logement ?? s.logements[0] ?? 'studio'
  const occupants = s.adultes + s.enfants
  const equivalentsAdultes = s.adultes + s.enfants * prixBase.divers.partEnfant

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
  const modesRetour = MODES.map((m) => estimerTransport(m, trajet, unePersonne, avRetour, saison)).filter((t) => t.possible)
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
  const total = totalMensuel * mois + ponctuel.voyage + ponctuel.installation

  const MODES_NOMS = { pied: 'À pied', velo: 'À vélo', transports: 'Abonnement de transports', voiture: 'En voiture' }
  const details: Record<PosteMensuel, LigneDetail[]> = {
    loyer: [{ libelle: `${LOGEMENTS[logement].nom}, zone « ${zone.nom.toLowerCase()} »${proche ? ` (${proche.nom})` : ''}, charges comprises`, montant: loyer }],
    trajets: [{ libelle: zone.coutTrajetMois === 0 ? 'Trajets à pied' : `${MODES_NOMS[zone.mode]}${av.remboursementTransport ? ', remboursé à 50 % par l’employeur' : ''}`, montant: trajets }],
    courses: [{ libelle: 'Courses et repas à la maison', montant: courses }],
    sorties: [{ libelle: av.activitesWeekend ? 'Sorties et activités du week-end' : 'Sorties', montant: sorties }],
    retours: [{ libelle: nbRetours ? `${s.stage.retours === 'chaque' ? 'Chaque week-end' : 'Un week-end sur deux'} : ≈ ${nbRetours.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} allers-retours par mois` : 'Pas de retour prévu', montant: retours }],
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
    transport,
    total,
    parPersonne: total / Math.max(1, occupants),
    avertissements,
  }
}
