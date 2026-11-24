import type { ModeTransport, Reglages, ReglagesSimples, Style, TypeLogement } from '../domain/types'
import { typeVoyage } from '../tripTypes'
import { coutsAvecActivites, estimerCouts, type EntreeCouts, type EstimationCouts } from './couts'
import { LOGEMENTS } from './logements'
import { meilleuresPeriodes, nomPeriode, type Periode, type ResultatPeriodes } from './periodes'
import { reglagesEffectifs } from './reglages'
import { budgetSejourLong, type BudgetSejourLong, type IdZone, type ZoneLogement } from './sejourLong'
import { estimerTransport, MODES } from './transport'

export type Badge = 'moins-chere' | 'rapport' | 'confort' | 'rapide' | 'proche' | 'choix' | 'variante' | 'periode'

export const BADGES: Record<Badge, string> = {
  'moins-chere': 'Moins chère',
  rapport: 'Meilleur rapport qualité-prix',
  confort: 'La plus confortable',
  rapide: 'La plus rapide',
  proche: 'La plus proche du travail',
  choix: 'Vos réglages',
  variante: 'Variante',
  periode: 'Autre période',
}

const NOMS_MODES: Record<ModeTransport, string> = { voiture: 'voiture', train: 'train', avion: 'avion', car: 'car' }

export interface Proposition {
  id: string
  badges: Badge[]
  titre: string
  /** « Airbnb / appartement · train » */
  sousTitre: string
  reglages: Reglages
  logement: TypeLogement
  transport: ModeTransport
  style: Style
  total: number
  parPersonne: number
  /** Durée d'un aller (voyage) ou du trajet domicile-travail le plus long (stage) */
  dureeTrajetMin: number
  /** Confort estimé sur 10 */
  confort: number
  /** Montants par poste, pour le tableau de comparaison */
  postes: { id: string; libelle: string; montant: number }[]
  nbActivites: number
  pointsForts: string[]
  pointsFaibles: string[]
  /** Total − budget (null sans budget) */
  ecartBudget: number | null
  periode?: Periode
  zone?: ZoneLogement
  estimation?: EstimationCouts
  sejourLong?: BudgetSejourLong
}

export interface ResultatPropositions {
  propositions: Proposition[]
  /** Aucune proposition dans le budget, etc. */
  alerte?: string
  periodes?: ResultatPeriodes
  /** Nombre de combinaisons calculées */
  candidats: number
}

export interface EntreePropositions extends EntreeCouts {
  aujourdhui: string
  /** Coût réel des activités de l'itinéraire pour ces réglages (sinon : estimation moyenne) */
  activites?: (r: Reglages) => { total: number; nombre: number }
  /** Nombre maximum de propositions (3 à 6) */
  maximum?: number
}

const STYLES: Style[] = ['eco', 'equilibre', 'confort']
const dureeTexte = (min: number) => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`
}
const euros = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} €`

/** Confort sur 10 : logement (et ses options), style, fatigue du trajet. */
function noteConfort(r: Reglages, dureeAllerMin: number, zone?: IdZone): number {
  const av = reglagesEffectifs(r)
  const s = r.simple
  let c = LOGEMENTS[av.typeLogement].confort
  if (av.typeLogement === 'hotel') c = { 2: 5.5, 3: 7, 4: 8.5 }[av.etoiles]
  if (av.typeLogement === 'appartement' && !av.airbnbEntier) c = 5
  if (av.typeLogement === 'auberge' && !av.aubergeDortoir) c = 5
  c += { eco: -1, equilibre: 0, confort: 1 }[s.style]
  if (zone) c += { proche: 1, moyenne: 0, eloignee: -1 }[zone]
  else {
    c -= Math.min(2, dureeAllerMin / 60 / 4)
    if (s.transport === 'voiture' && dureeAllerMin > 300) c -= 0.5
    if (s.transport === 'avion' && av.classe !== 'eco') c += 0.5
  }
  return Math.round(Math.max(0, Math.min(10, c)) * 10) / 10
}

/** Modes réalistes : possibles, et pas beaucoup plus lents que le plus rapide (week-end : 6 h au plus). */
function modesRealistes(entree: EntreeCouts, s: ReglagesSimples): ModeTransport[] {
  const av = reglagesEffectifs(entree.reglages)
  const estimes = MODES.map((m) => estimerTransport(m, entree.trajet, s, av, 'moyenne')).filter((t) => t.possible)
  if (!estimes.length) return [s.transport]
  const plusRapide = Math.min(...estimes.map((t) => t.dureeAllerMin))
  const limite = Math.max(plusRapide * 2.5, plusRapide + 240)
  const garde = estimes
    .filter((t) => t.mode === s.transport || (t.dureeAllerMin <= limite && (s.typeVoyage !== 'weekend' || t.dureeAllerMin <= 360 || t.dureeAllerMin === plusRapide)))
    .map((t) => t.mode)
  return garde.length ? garde : [s.transport]
}

const variante = (r: Reglages, simple: Partial<ReglagesSimples>, logement: TypeLogement): Reglages => ({
  simple: { ...r.simple, ...simple },
  modifies: { ...r.modifies, typeLogement: logement },
})

/** Proposition d'un voyage court (vacances, week-end, dates flexibles). */
function propositionVoyage(entree: EntreePropositions, r: Reglages, periode?: Periode): Proposition {
  const brut = estimerCouts({ ...entree, reglages: r })
  const activites = entree.activites?.(r)
  const e = activites ? coutsAvecActivites(brut, activites.total, reglagesEffectifs(r).tauxImprevus) : brut
  const av = reglagesEffectifs(r)
  const s = r.simple
  const libellesPostes: Record<string, string> = { transport: 'Transport', logement: 'Logement', repas: 'Repas', activites: 'Activités', transportLocal: 'Sur place', divers: 'Divers', imprevus: 'Imprévus' }
  return {
    id: `${av.typeLogement}-${s.transport}-${s.style}${periode ? `-${periode.annee}-${periode.mois}` : ''}`,
    badges: [],
    titre: '',
    sousTitre: `${LOGEMENTS[av.typeLogement].nom} · ${NOMS_MODES[s.transport]}`,
    reglages: r,
    logement: av.typeLogement,
    transport: s.transport,
    style: s.style,
    total: e.total,
    parPersonne: e.parPersonne,
    dureeTrajetMin: e.transport.possible ? e.transport.dureeAllerMin : 0,
    confort: noteConfort(r, e.transport.dureeAllerMin),
    postes: Object.entries(e.postes).map(([id, montant]) => ({ id, libelle: libellesPostes[id], montant })),
    nbActivites: activites?.nombre ?? Math.round(e.activitesPrevues),
    pointsForts: [],
    pointsFaibles: [],
    ecartBudget: s.budget == null ? null : e.total - s.budget,
    periode,
    estimation: e,
  }
}

/** Proposition d'un séjour long (stage) : un type de logement dans une zone. */
function propositionSejour(entree: EntreePropositions, logement: TypeLogement, zone: IdZone): Proposition {
  const r = variante(entree.reglages, { stage: { ...entree.reglages.simple.stage, zone } }, logement)
  const b = budgetSejourLong({ ...entree, reglages: r, logement, zone })
  const s = r.simple
  const libelles: Record<string, string> = { loyer: 'Loyer', trajets: 'Trajets domicile-travail', courses: 'Courses', sorties: 'Sorties', retours: 'Retours le week-end', divers: 'Divers et imprévus' }
  return {
    id: `${logement}-${zone}`,
    badges: [],
    titre: '',
    sousTitre: `${LOGEMENTS[logement].nom} · ${b.zone.nom.toLowerCase()}`,
    reglages: r,
    logement,
    transport: s.transport,
    style: s.style,
    total: b.total,
    parPersonne: b.parPersonne,
    dureeTrajetMin: b.zone.minutes,
    confort: noteConfort(r, 0, zone),
    postes: [
      ...Object.entries(b.parMois).map(([id, montant]) => ({ id, libelle: `${libelles[id]} / mois`, montant })),
      { id: 'voyage', libelle: 'Voyage aller-retour', montant: b.ponctuel.voyage },
      { id: 'installation', libelle: 'Installation', montant: b.ponctuel.installation },
    ],
    nbActivites: 0,
    pointsForts: [],
    pointsFaibles: [],
    ecartBudget: s.budget == null ? null : b.total - s.budget,
    zone: b.zone,
    sejourLong: b,
  }
}

/** Points forts et points faibles, par rapport aux autres propositions. */
function commenter(p: Proposition, toutes: Proposition[], stage: boolean) {
  const min = Math.min(...toutes.map((x) => x.total))
  const max = Math.max(...toutes.map((x) => x.total))
  const dureeMin = Math.min(...toutes.map((x) => x.dureeTrajetMin))
  const av = reglagesEffectifs(p.reglages)
  const forts: string[] = []
  const faibles: string[] = []
  if (p.total === min) forts.push('Le prix le plus bas')
  if (p.ecartBudget != null && p.ecartBudget <= 0) forts.push(`Dans votre budget (${euros(-p.ecartBudget)} de marge)`)
  if (stage) {
    if (p.sejourLong) forts.push(`≈ ${euros(p.sejourLong.totalMensuel)} par mois`)
    if (p.zone?.id === 'proche') forts.push('À pied du travail, sans frais de trajet')
    if (p.zone?.id === 'eloignee') faibles.push(`Jusqu’à ${p.zone.minutes} min de trajet`)
    if (p.logement === 'colocation') faibles.push('Cuisine et salle de bain partagées')
    if (p.logement === 'habitant') faibles.push('Vous vivez chez quelqu’un')
    if (p.logement === 'studio' || p.logement === 'appartement') forts.push('Un logement rien qu’à vous')
    if (p.logement === 'residence') forts.push('Meublé, charges et internet compris')
  } else {
    if (toutes.some((x) => x.transport !== p.transport) && p.dureeTrajetMin === dureeMin && p.dureeTrajetMin > 0) forts.push(`Trajet le plus court (${dureeTexte(p.dureeTrajetMin)})`)
    if (p.dureeTrajetMin > Math.max(120, dureeMin * 1.5)) faibles.push(`Trajet plus long (${dureeTexte(p.dureeTrajetMin)})`)
    if (LOGEMENTS[p.logement].cuisine && p.logement !== 'camping') forts.push('Une cuisine pour faire ses courses')
    if (p.logement === 'hotel') {
      forts.push('Ménage et accueil sur place')
      faibles.push('Pas de cuisine : repas à l’extérieur')
    }
    if (p.logement === 'appartement' && av.fraisAirbnb) faibles.push('Frais de ménage et de service en plus')
    if (p.logement === 'auberge' && av.aubergeDortoir) faibles.push('Dortoir partagé')
    if (p.logement === 'camping') faibles.push('Confort sommaire')
    if (p.transport === 'train') forts.push('Le train : peu de CO₂ et du temps pour soi')
  }
  if (p.confort >= 8) forts.unshift('Très confortable')
  if (p.ecartBudget != null && p.ecartBudget > 0) faibles.unshift(`Dépasse le budget de ${euros(p.ecartBudget)}`)
  if (p.total === max && toutes.length > 1 && max - min > 1) faibles.push('La plus chère des propositions')
  p.pointsForts = [...new Set(forts)].slice(0, 3)
  p.pointsFaibles = [...new Set(faibles)].slice(0, 2)
}

/** Deux propositions presque identiques : même logement et même transport, moins de 3 % d'écart. */
const doublon = (a: Proposition, b: Proposition) =>
  a.logement === b.logement && a.transport === b.transport && a.zone?.id === b.zone?.id && a.periode?.dateDepart === b.periode?.dateDepart && Math.abs(a.total - b.total) / Math.max(1, a.total) < 0.03

/**
 * Combine les options cochées (types de logement, modes de transport réalistes, style voisin,
 * périodes pour les dates flexibles, zones pour un stage), puis garde 3 à 6 propositions :
 * la moins chère, le meilleur rapport qualité-prix, la plus confortable, la plus rapide
 * (ou la plus proche du travail), et une version par type de logement coché.
 */
export function genererPropositions(entree: EntreePropositions): ResultatPropositions {
  const maximum = Math.min(6, Math.max(3, entree.maximum ?? 6))
  const def = typeVoyage(entree.reglages.simple)
  let s = entree.reglages.simple
  const stage = def.calcul === 'sejourLong'
  let periodes: ResultatPeriodes | undefined

  // Dates flexibles : on part de la période la moins chère
  if (def.calcul === 'periodes') {
    periodes = meilleuresPeriodes(entree, entree.aujourdhui)
    const meilleure = periodes.meilleures[0]
    if (meilleure) s = { ...s, dateDepart: meilleure.dateDepart, nuits: meilleure.nuits }
  }
  const base: Reglages = { ...entree.reglages, simple: s }
  const logements = s.logements.length ? s.logements : [reglagesEffectifs(base).typeLogement]

  let candidats: Proposition[] = []
  if (stage) {
    const zones = budgetSejourLong(entree).zones.map((z) => z.id)
    for (const l of logements) for (const z of zones) candidats.push(propositionSejour({ ...entree, reglages: base }, l, z))
  } else {
    const modes = modesRealistes({ ...entree, reglages: base }, s)
    const periode = periodes?.meilleures[0]
    for (const l of logements) for (const m of modes) candidats.push(propositionVoyage(entree, variante(base, { transport: m }, l), periode))
    // Styles voisins (pour « plus confortable » et « moins chère » qui aient un sens)
    const i = STYLES.indexOf(s.style)
    for (const st of [STYLES[i - 1], STYLES[i + 1]].filter(Boolean)) {
      for (const l of logements) candidats.push(propositionVoyage(entree, variante(base, { style: st }, l), periode))
    }
  }
  // Uniques
  const vus = new Set<string>()
  candidats = candidats.filter((c) => !vus.has(c.id) && vus.add(c.id))
  const nbCandidats = candidats.length

  const parPrix = [...candidats].sort((a, b) => a.total - b.total)
  const moinsChere = parPrix[0]
  const choisies: Proposition[] = []
  const ajouter = (p: Proposition | undefined, badge: Badge, titre?: string) => {
    if (!p) return
    const existante = choisies.find((x) => x.id === p.id) ?? choisies.find((x) => doublon(x, p))
    if (existante) {
      // Une variante déjà présente sous un autre badge n'a pas besoin d'un second titre
      if (!existante.badges.includes(badge) && badge !== 'variante' && badge !== 'periode') existante.badges.push(badge)
      return
    }
    if (choisies.length >= maximum) return
    p.badges.push(badge)
    p.titre = titre ?? BADGES[badge]
    choisies.push(p)
  }

  ajouter(moinsChere, 'moins-chere')
  // Rapport qualité-prix : chaque tranche de 25 % au-dessus du moins cher coûte un point de confort
  const rapport = (p: Proposition) => p.confort - 4 * (p.total / moinsChere.total - 1)
  ajouter([...candidats].sort((a, b) => rapport(b) - rapport(a) || a.total - b.total)[0], 'rapport')
  // « La plus confortable », sans dépasser de beaucoup le budget ni le double du moins cher
  const plafond = Math.max(moinsChere.total * 2, (s.budget ?? 0) * 1.25)
  ajouter([...candidats].filter((c) => c.total <= plafond).sort((a, b) => b.confort - a.confort || a.total - b.total)[0], 'confort')
  if (stage) ajouter([...candidats].filter((c) => c.zone?.id === 'proche').sort((a, b) => a.total - b.total)[0], 'proche')
  else if (new Set(candidats.map((c) => c.transport)).size > 1) ajouter([...candidats].sort((a, b) => a.dureeTrajetMin - b.dureeTrajetMin || a.total - b.total)[0], 'rapide')
  // Les réglages de l'utilisateur, tels quels
  const choix = candidats.find((c) => c.style === s.style && c.logement === reglagesEffectifs(base).typeLogement && (stage ? c.zone?.id === 'moyenne' : c.transport === s.transport))
  ajouter(choix, 'choix')
  // Une version par type de logement coché (style choisi ; zone « proche » d'abord pour un stage, sinon la moins chère)
  for (const l of logements) {
    if (choisies.some((c) => c.logement === l)) continue
    const parmi = candidats.filter((c) => c.logement === l && c.style === s.style).sort((a, b) => a.total - b.total)
    ajouter(parmi[0], 'variante', LOGEMENTS[l].version)
  }
  // Dates flexibles : les 2 autres meilleures périodes, avec la combinaison la moins chère
  if (periodes && !stage) {
    for (const p of periodes.meilleures.slice(1)) {
      const r = { ...moinsChere.reglages, simple: { ...moinsChere.reglages.simple, dateDepart: p.dateDepart, nuits: p.nuits } }
      ajouter(propositionVoyage(entree, r, p), 'periode', `En ${nomPeriode(p)}`)
    }
  }
  // Au moins 3 propositions quand c'est possible : les moins chères parmi les autres combinaisons
  for (const c of parPrix) {
    if (choisies.length >= Math.min(3, nbCandidats)) break
    if (choisies.some((x) => x.id === c.id || doublon(x, c))) continue
    ajouter(c, 'variante', c.logement !== moinsChere.logement ? LOGEMENTS[c.logement].version : `En ${NOMS_MODES[c.transport]}`)
  }

  // Ordre : moins chère d'abord, puis les autres badges, puis les variantes par prix
  const ordre: Badge[] = ['moins-chere', 'rapport', 'confort', 'rapide', 'proche', 'choix', 'variante', 'periode']
  const rang = (p: Proposition) => Math.min(...p.badges.map((b) => ordre.indexOf(b)))
  choisies.sort((a, b) => rang(a) - rang(b) || a.total - b.total)
  for (const p of choisies) commenter(p, choisies, stage)

  const budget = s.budget
  const alerte =
    budget != null && choisies.every((p) => p.total > budget)
      ? `Aucune proposition ne tient dans votre budget de ${euros(budget)} : la moins chère le dépasse de ${euros(moinsChere.total - budget)}. Ouvrez-la pour voir où économiser.`
      : periodes?.alerte

  return { propositions: choisies, alerte, periodes, candidats: nbCandidats }
}
