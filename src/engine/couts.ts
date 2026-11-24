import { donneesPays, prixBase } from '../data'
import type { Coordonnees, Interet, Reglages, ReglagesAvances, ReglagesSimples, Saison, TypeActivite } from '../domain/types'
import { saisonDuMois } from './apercu'
import { moisDe } from './dates'
import { reglagesEffectifs } from './reglages'
import { LOGEMENTS } from './logements'
import { estimerTransport, type DonneesTrajet, type EstimationTransport, type LigneDetail } from './transport'
import { villeProche } from './villes'

export type Poste = 'transport' | 'logement' | 'repas' | 'activites' | 'transportLocal' | 'divers' | 'imprevus'
export const POSTES: Poste[] = ['transport', 'logement', 'repas', 'activites', 'transportLocal', 'divers', 'imprevus']

export interface EstimationCouts {
  postes: Record<Poste, number>
  details: Record<Poste, LigneDetail[]>
  total: number
  /** Fourchette du total : prix bas et prix haut (le total est la valeur la plus probable) */
  fourchette: { bas: number; haut: number }
  parPersonne: number
  transport: EstimationTransport
  /** Ville dont les prix d'hôtel et de restaurant sont appliqués (« Lyon »), si elle est connue */
  ville?: string
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

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

/**
 * Coût du logement pour tout le séjour : nuitées (prix France × indice du pays × saison × quartier),
 * frais de ménage et de service (Airbnb), taxe de séjour.
 */
export function coutLogement(
  av: ReglagesAvances,
  s: Pick<ReglagesSimples, 'adultes' | 'enfants' | 'nuits' | 'style'> & Partial<Pick<ReglagesSimples, 'bebes'>>,
  contexte: { indice: number; saison: number; france: boolean },
): { nuits: number; total: number; lignes: LigneDetail[] } {
  const L = prixBase.logement
  const st = s.style
  const nuits = Math.max(1, s.nuits)
  // Un bébé dort dans la chambre de ses parents (lit parapluie) : il ne compte pas
  const voyageurs = s.adultes + s.enfants - (s.bebes ?? 0)
  const chambresParDeux = Math.max(1, Math.ceil(voyageurs / 2))
  let nuitee: number
  let libelle: string
  let cleTaxe: keyof typeof L.taxeSejour = 'habitant'
  switch (av.typeLogement) {
    case 'hotel':
      nuitee = L[`hotel${av.etoiles}`][st] * av.chambres
      libelle = `Hôtel ${av.etoiles} étoiles, ${pluriel(av.chambres, 'chambre')}`
      cleTaxe = `hotel${av.etoiles}`
      break
    case 'appartement':
      if (av.airbnbEntier) {
        nuitee = L.appartement[st] * (1 + 0.15 * Math.max(0, voyageurs - 2)) * Math.max(1, av.chambres)
        libelle = av.chambres > 1 ? `${av.chambres} logements entiers (Airbnb)` : 'Logement entier (Airbnb)'
      } else {
        nuitee = L.chambreAirbnb[st] * chambresParDeux
        libelle = `${pluriel(chambresParDeux, 'chambre')} dans un logement (Airbnb)`
      }
      cleTaxe = 'appartement'
      break
    case 'habitant':
      nuitee = L.habitant[st] * chambresParDeux
      libelle = `Chez l’habitant, ${pluriel(chambresParDeux, 'chambre')}`
      break
    case 'auberge':
      if (av.aubergeDortoir) {
        nuitee = L.auberge[st] * voyageurs
        libelle = `Auberge, ${pluriel(voyageurs, 'lit')} en dortoir`
      } else {
        nuitee = L.aubergePrivee[st] * chambresParDeux
        libelle = `Auberge, ${pluriel(chambresParDeux, 'chambre privée')}`
      }
      cleTaxe = 'auberge'
      break
    case 'camping':
      nuitee = L.camping[st] * (1 + 0.2 * Math.max(0, voyageurs - 2))
      libelle = 'Camping'
      cleTaxe = 'camping'
      break
    case 'gite':
      nuitee = L.gite[st] * (1 + 0.12 * Math.max(0, voyageurs - 4))
      libelle = 'Gîte (logement entier)'
      cleTaxe = 'gite'
      break
    default: {
      // Logements au mois (studio, colocation, résidence) : prix mensuel ramené à la nuit
      const SL = prixBase.sejourLong
      nuitee = (SL.loyerMensuel[av.typeLogement][st] * (1 + SL.occupantSupplementaire[av.typeLogement] * Math.max(0, voyageurs - 1))) / 30
      libelle = LOGEMENTS[av.typeLogement].nom
    }
  }
  const coefQuartier = av.quartier === 'centre' ? L.supplementCentre : L.remiseCalme
  const montantNuits = nuitee * coefQuartier * contexte.indice * contexte.saison * nuits
  const lignes: LigneDetail[] = [{ libelle: `${libelle}, ${pluriel(nuits, 'nuit')}`, montant: montantNuits }]

  if (av.typeLogement === 'appartement' && av.fraisAirbnb) {
    const menage = L.menageAirbnb[st] * contexte.indice * (av.airbnbEntier ? Math.max(1, av.chambres) : 1)
    lignes.push({ libelle: 'Frais de ménage', montant: menage }, { libelle: `Frais de service (≈ ${Math.round(L.serviceAirbnb * 100)} %)`, montant: (montantNuits + menage) * L.serviceAirbnb })
  }
  if (av.taxeSejour && LOGEMENTS[av.typeLogement].court) {
    // Barème français ; à l'étranger, ordre de grandeur ajusté au coût de la vie
    const taxe = L.taxeSejour[cleTaxe] * s.adultes * nuits * (contexte.france ? 1 : contexte.indice)
    lignes.push({ libelle: 'Taxe de séjour', montant: taxe })
  }
  return { nuits: montantNuits, total: lignes.reduce((a, l) => a + l.montant, 0), lignes }
}

export interface EntreeCouts {
  trajet: DonneesTrajet
  arrivee: Coordonnees & { pays?: string }
  reglages: Reglages
}

/** Repas et souvenirs : enfant 70 % d'un adulte, bébé 30 %. */
export function equivalentsRepas(s: Pick<ReglagesSimples, 'adultes' | 'enfants'> & Partial<Pick<ReglagesSimples, 'bebes'>>): number {
  const bebes = Math.min(s.enfants, s.bebes ?? 0)
  return s.adultes + (s.enfants - bebes) * prixBase.divers.partEnfant + bebes * 0.3
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
  // Prix de la ville : hôtels et restaurants plus chers à Paris, Nice ou Venise qu'en moyenne dans le pays
  const ville = villeProche(arrivee)
  const kHotel = ville?.hotel ?? 1
  const kRepas = ville?.repas ?? 1
  const nuits = Math.max(1, s.nuits)
  const jours = nuits + 1
  const voyageurs = s.adultes + s.enfants
  const equivalentsAdultes = equivalentsRepas(s)
  const avertissements: string[] = []
  if (pays.estimationContinent) avertissements.push(`Pays absent de notre base : prix estimés d’après la moyenne de la région.`)

  // Transport
  const transport = estimerTransport(s.transport, trajet, s, av, saison)
  if (!transport.possible && transport.raison) avertissements.push(transport.raison)

  // Logement
  const logement = coutLogement(av, s, { indice: k * kHotel, saison: pays.saison[saison], france: pays.code === 'fr' })
  const petitDej = av.petitDejeuner && ['hotel', 'habitant', 'auberge', 'gite'].includes(av.typeLogement) ? prixBase.logement.petitDejeunerParPersonne[s.style] * k * equivalentsAdultes * nuits : 0
  const cuisine = LOGEMENTS[av.typeLogement].cuisine
  const st = s.style

  // Repas : 2 repas par jour, une part au restaurant, le reste en snack ou courses ; petit-déjeuner maison sauf s'il est inclus
  const R = prixBase.repas
  const restosParJour = Math.min(2, av.restosParJour * Math.min(1, av.partRestaurant))
  const autres = 2 - restosParJour
  // Avec une cuisine, les autres repas sont des courses ; sinon moitié courses, moitié snack
  const repasHorsResto = cuisine ? R.courses[st] : (R.courses[st] + R.snack[st]) / 2
  const parJour = restosParJour * R.restaurant[av.niveauResto] + autres * repasHorsResto + (av.petitDejeuner ? 0 : R.petitDejeunerMaison)
  const repas = parJour * k * kRepas * equivalentsAdultes * jours

  // Activités : rythme = activités par jour plein ; le premier et le dernier jour comptent pour moitié
  const joursActifs = nuits * (av.tempsLibre ? 0.8 : 1) // (nuits + 1) jours, dont 2 demi-journées
  const activitesPrevues = av.rythme * joursActifs
  const prixActivite = av.gratuitesUniquement ? 0 : prixMoyenActivite(s, av)
  const activites = activitesPrevues * (1 - PART_GRATUITE) * prixActivite * k * kRepas * equivalentsAdultes

  // Transport sur place
  const TL = prixBase.transportLocal
  const local =
    av.transportLocal === 'voiture' ? TL.voiture[st] * av.vehicules * jours * k : TL[av.transportLocal][st] * equivalentsAdultes * jours * k

  // Divers
  const assurance = av.assurance ? prixBase.divers.assuranceParPersonneParJour * voyageurs * jours : 0
  const souvenirs = av.souvenirs ? prixBase.divers.souvenirsParPersonneParJour[st] * equivalentsAdultes * jours * k : 0

  const postes: Record<Poste, number> = {
    transport: transport.total,
    logement: logement.total + petitDej,
    repas,
    activites,
    transportLocal: local,
    divers: assurance + souvenirs,
    imprevus: 0,
  }
  const sousTotal = Object.values(postes).reduce((a, b) => a + b, 0)
  postes.imprevus = sousTotal * av.tauxImprevus
  const total = sousTotal + postes.imprevus
  const fourchette = fourchetteDuTotal(postes, transport, av.tauxImprevus)

  const NOMS_LOCAL = { transports: 'Transports en commun', voiture: 'Voiture sur place', velo: 'Vélo', pied: 'À pied' }
  return {
    postes,
    details: {
      transport: transport.details,
      logement: [...logement.lignes, ...(petitDej ? [{ libelle: 'Petits-déjeuners', montant: petitDej }] : [])],
      repas: [{ libelle: `${jours} jours de repas (≈ ${Math.round(parJour * k * kRepas)} € par adulte et par jour)`, montant: repas }],
      activites: [{ libelle: `≈ ${Math.round(activitesPrevues)} activités, dont un tiers gratuites`, montant: activites }],
      transportLocal: [{ libelle: NOMS_LOCAL[av.transportLocal], montant: local }],
      divers: [
        ...(assurance ? [{ libelle: 'Assurance voyage', montant: assurance }] : []),
        ...(souvenirs ? [{ libelle: 'Souvenirs et petits achats', montant: souvenirs }] : []),
      ],
      imprevus: [{ libelle: `Marge pour imprévus (${Math.round(av.tauxImprevus * 100)} %)`, montant: postes.imprevus }],
    },
    total,
    fourchette,
    parPersonne: total / Math.max(1, voyageurs),
    transport,
    ...(ville ? { ville: ville.nom } : {}),
    saison,
    pays: { nom: pays.nom, indice: k, estimationContinent: pays.estimationContinent },
    activitesPrevues,
    avertissements,
  }
}

/**
 * Écart autour de chaque poste : le transport a sa propre fourchette (tarifs officiels ou barèmes) ;
 * pour le reste, les prix réels varient d'environ -15 % à +20 % (logement, repas) et davantage
 * pour les activités et les dépenses sur place.
 */
export const ECARTS: Record<Exclude<Poste, 'transport' | 'imprevus'>, [number, number]> = {
  logement: [0.85, 1.2],
  repas: [0.85, 1.2],
  activites: [0.75, 1.3],
  transportLocal: [0.8, 1.25],
  divers: [0.8, 1.3],
}

export function fourchetteDuTotal(postes: Record<Poste, number>, transport: EstimationTransport, tauxImprevus: number): { bas: number; haut: number } {
  let bas = transport.possible ? transport.fourchette.bas : 0
  let haut = transport.possible ? transport.fourchette.haut : 0
  for (const [poste, [b, h]] of Object.entries(ECARTS) as [keyof typeof ECARTS, [number, number]][]) {
    bas += postes[poste] * b
    haut += postes[poste] * h
  }
  return { bas: bas * (1 + tauxImprevus), haut: haut * (1 + tauxImprevus) }
}

/** Position du total par rapport au budget. */
export function etatBudget(total: number, budget: number | null): { statut: 'libre' | 'ok' | 'juste' | 'depasse'; ratio: number } {
  if (budget == null || budget <= 0) return { statut: 'libre', ratio: 0 }
  const ratio = total / budget
  return { statut: ratio > 1 ? 'depasse' : ratio > 0.9 ? 'juste' : 'ok', ratio }
}

/**
 * Remplace l'estimation moyenne des activités par le coût réel de l'itinéraire généré,
 * et recalcule la marge pour imprévus et le total.
 */
export function coutsAvecActivites(e: EstimationCouts, totalActivites: number, tauxImprevus: number): EstimationCouts {
  const postes = { ...e.postes, activites: totalActivites, imprevus: 0 }
  const sousTotal = Object.values(postes).reduce((a, b) => a + b, 0)
  postes.imprevus = sousTotal * tauxImprevus
  const total = sousTotal + postes.imprevus
  const voyageurs = e.total > 0 && e.parPersonne > 0 ? e.total / e.parPersonne : 1
  return {
    ...e,
    fourchette: fourchetteDuTotal(postes, e.transport, tauxImprevus),
    postes,
    details: {
      ...e.details,
      activites: [{ libelle: 'Activités de l’itinéraire (gratuites comprises)', montant: totalActivites }],
      imprevus: [{ libelle: `Marge pour imprévus (${Math.round(tauxImprevus * 100)} %)`, montant: postes.imprevus }],
    },
    total,
    parPersonne: total / voyageurs,
  }
}
