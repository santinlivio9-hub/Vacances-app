import { donneesPays, prixBase } from '../data'
import type { Coordonnees, Interet, Reglages, ReglagesAvances, ReglagesSimples, Saison, TypeActivite } from '../domain/types'
import { saisonDuMois } from './apercu'
import { moisDe } from './dates'
import { reglagesEffectifs } from './reglages'
import { estimerTransport, type DonneesTrajet, type EstimationTransport, type LigneDetail } from './transport'

export type Poste = 'transport' | 'logement' | 'repas' | 'activites' | 'transportLocal' | 'divers' | 'imprevus'
export const POSTES: Poste[] = ['transport', 'logement', 'repas', 'activites', 'transportLocal', 'divers', 'imprevus']

export interface EstimationCouts {
  postes: Record<Poste, number>
  details: Record<Poste, LigneDetail[]>
  total: number
  parPersonne: number
  transport: EstimationTransport
  saison: Saison
  pays: { nom: string; indice: number; estimationContinent: boolean }
  /** Nombre moyen d'activités payantes prévues (servira à l'itinéraire) */
  activitesPrevues: number
  avertissements: string[]
}

/** Types d'activité privilégiés par intérêt (servent aussi à l'itinéraire). */
export const TYPES_PAR_INTERET: Record<Interet, TypeActivite[]> = {
  culture: ['musee', 'monument', 'visite_guidee'],
  nature: ['nature', 'parc', 'point_de_vue'],
  plage: ['plage'],
  gastronomie: ['marche', 'visite_guidee'],
  sport: ['nature', 'parc_attractions'],
  fete: ['spectacle'],
  detente: ['parc', 'plage', 'point_de_vue'],
  shopping: ['marche'],
}

/** Part des activités qui sont gratuites (parcs, points de vue, balades…) quand on ne filtre pas. */
const PART_GRATUITE = 0.35

/** Prix moyen d'une activité payante selon les intérêts, le style et les filtres. */
export function prixMoyenActivite(simple: ReglagesSimples, av: Pick<ReglagesAvances, 'budgetMaxActivite' | 'activitesIncluses' | 'activitesExclues'>): number {
  let types = [...new Set((simple.interets.length ? simple.interets : (['culture'] as Interet[])).flatMap((i) => TYPES_PAR_INTERET[i]))]
  types = [...new Set([...types, ...(av.activitesIncluses as TypeActivite[])])].filter((t) => !av.activitesExclues.includes(t))
  const prix = types.map((t) => prixBase.activites[t][simple.style]).filter((p) => p > 0)
  if (prix.length === 0) return 0
  const moyenne = prix.reduce((a, b) => a + b, 0) / prix.length
  return av.budgetMaxActivite == null ? moyenne : Math.min(moyenne, av.budgetMaxActivite)
}

export interface EntreeCouts {
  trajet: DonneesTrajet
  arrivee: Coordonnees & { pays?: string }
  reglages: Reglages
}

/**
 * Estimation complète d'un voyage. Prix France × indice du pays × saison (logement) ;
 * enfants : 70 % pour repas, activités et souvenirs, 100 % pour transport et logement.
 */
export function estimerCouts({ trajet, arrivee, reglages }: EntreeCouts): EstimationCouts {
  const s = reglages.simple
  const av = reglagesEffectifs(reglages)
  const pays = donneesPays(arrivee.pays, arrivee)
  const saison = saisonDuMois(pays, moisDe(s.dateDepart))
  const k = pays.indice
  const nuits = Math.max(1, s.nuits)
  const jours = nuits + 1
  const voyageurs = s.adultes + s.enfants
  const equivalentsAdultes = s.adultes + s.enfants * prixBase.divers.partEnfant
  const avertissements: string[] = []
  if (pays.estimationContinent) avertissements.push(`Pays absent de notre base : prix estimés d’après la moyenne de la région.`)

  // Transport
  const transport = estimerTransport(s.transport, trajet, s, av, saison)
  if (!transport.possible && transport.raison) avertissements.push(transport.raison)

  // Logement
  const L = prixBase.logement
  const st = s.style
  let nuitee: number
  let libelleLogement: string
  switch (av.typeLogement) {
    case 'hotel':
      nuitee = L[`hotel${av.etoiles}`][st] * av.chambres
      libelleLogement = `Hôtel ${av.etoiles} étoiles, ${av.chambres} chambre${av.chambres > 1 ? 's' : ''}`
      break
    case 'appartement':
      nuitee = L.appartement[st] * (1 + 0.15 * Math.max(0, voyageurs - 2)) * Math.max(1, av.chambres)
      libelleLogement = av.chambres > 1 ? `${av.chambres} appartements` : 'Appartement'
      break
    case 'auberge':
      nuitee = L.auberge[st] * voyageurs
      libelleLogement = `Auberge, ${voyageurs} lit${voyageurs > 1 ? 's' : ''}`
      break
    case 'camping':
      nuitee = L.camping[st] * (1 + 0.2 * Math.max(0, voyageurs - 2))
      libelleLogement = 'Camping'
      break
  }
  nuitee *= (av.quartier === 'centre' ? L.supplementCentre : L.remiseCalme) * k * pays.saison[saison]
  const logementNuits = nuitee * nuits
  const petitDej = av.petitDejeuner && av.typeLogement !== 'camping' ? L.petitDejeunerParPersonne[st] * k * equivalentsAdultes * nuits : 0

  // Repas : 2 repas par jour, une part au restaurant, le reste en snack ou courses ; petit-déjeuner maison sauf s'il est inclus
  const R = prixBase.repas
  const restosParJour = Math.min(2, av.restosParJour * Math.min(1, av.partRestaurant))
  const autres = 2 - restosParJour
  const parJour =
    restosParJour * R.restaurant[av.niveauResto] + autres * ((R.courses[st] + R.snack[st]) / 2) + (av.petitDejeuner ? 0 : R.petitDejeunerMaison)
  const repas = parJour * k * equivalentsAdultes * jours

  // Activités : rythme = activités par jour plein ; le premier et le dernier jour comptent pour moitié
  const joursActifs = nuits * (av.tempsLibre ? 0.8 : 1) // (nuits + 1) jours, dont 2 demi-journées
  const activitesPrevues = av.rythme * joursActifs
  const prixActivite = av.gratuitesUniquement ? 0 : prixMoyenActivite(s, av)
  const activites = activitesPrevues * (1 - PART_GRATUITE) * prixActivite * k * equivalentsAdultes

  // Transport sur place
  const TL = prixBase.transportLocal
  const local =
    av.transportLocal === 'voiture' ? TL.voiture[st] * av.vehicules * jours * k : TL[av.transportLocal][st] * equivalentsAdultes * jours * k

  // Divers
  const assurance = av.assurance ? prixBase.divers.assuranceParPersonneParJour * voyageurs * jours : 0
  const souvenirs = av.souvenirs ? prixBase.divers.souvenirsParPersonneParJour[st] * equivalentsAdultes * jours * k : 0

  const postes: Record<Poste, number> = {
    transport: transport.total,
    logement: logementNuits + petitDej,
    repas,
    activites,
    transportLocal: local,
    divers: assurance + souvenirs,
    imprevus: 0,
  }
  const sousTotal = Object.values(postes).reduce((a, b) => a + b, 0)
  postes.imprevus = sousTotal * av.tauxImprevus
  const total = sousTotal + postes.imprevus

  const NOMS_LOCAL = { transports: 'Transports en commun', voiture: 'Voiture sur place', velo: 'Vélo', pied: 'À pied' }
  return {
    postes,
    details: {
      transport: transport.details,
      logement: [
        { libelle: `${libelleLogement}, ${nuits} nuit${nuits > 1 ? 's' : ''}`, montant: logementNuits },
        ...(petitDej ? [{ libelle: 'Petits-déjeuners', montant: petitDej }] : []),
      ],
      repas: [{ libelle: `${jours} jours de repas (≈ ${Math.round(parJour * k)} € par adulte et par jour)`, montant: repas }],
      activites: [{ libelle: `≈ ${Math.round(activitesPrevues)} activités, dont un tiers gratuites`, montant: activites }],
      transportLocal: [{ libelle: NOMS_LOCAL[av.transportLocal], montant: local }],
      divers: [
        ...(assurance ? [{ libelle: 'Assurance voyage', montant: assurance }] : []),
        ...(souvenirs ? [{ libelle: 'Souvenirs et petits achats', montant: souvenirs }] : []),
      ],
      imprevus: [{ libelle: `Marge pour imprévus (${Math.round(av.tauxImprevus * 100)} %)`, montant: postes.imprevus }],
    },
    total,
    parPersonne: total / Math.max(1, voyageurs),
    transport,
    saison,
    pays: { nom: pays.nom, indice: k, estimationContinent: pays.estimationContinent },
    activitesPrevues,
    avertissements,
  }
}

/** Position du total par rapport au budget. */
export function etatBudget(total: number, budget: number | null): { statut: 'libre' | 'ok' | 'juste' | 'depasse'; ratio: number } {
  if (budget == null || budget <= 0) return { statut: 'libre', ratio: 0 }
  const ratio = total / budget
  return { statut: ratio > 1 ? 'depasse' : ratio > 0.9 ? 'juste' : 'ok', ratio }
}
