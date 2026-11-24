import type { ReglagesAvances, ReglagesSimples, Style } from '../domain/types'
import { estimerCouts, type EntreeCouts, type EstimationCouts, type Poste } from './couts'
import { reglagesEffectifs } from './reglages'
import { MODES } from './transport'

/** Un changement de réglages proposé pour économiser. */
export interface Changement {
  simple?: Partial<ReglagesSimples>
  avances?: Partial<ReglagesAvances>
}

export interface SuggestionEconomie {
  id: string
  titre: string
  poste: Poste
  changement: Changement
  /** Économie en euros sur le total, calculée en relançant l'estimation */
  economie: number
}

export interface AjustementBudget {
  budget: number
  totalInitial: number
  depassement: number
  /** Toutes les pistes, de la plus efficace à la moins efficace */
  suggestions: SuggestionEconomie[]
  /** Combinaison minimale de pistes (appliquées dans l'ordre) pour tenir le budget */
  plan: SuggestionEconomie[]
  totalApresPlan: number
  atteignable: boolean
}

export function appliquerChangement(entree: EntreeCouts, c: Changement): EntreeCouts {
  const { reglages } = entree
  return {
    ...entree,
    reglages: {
      simple: { ...reglages.simple, ...c.simple },
      modifies: { ...reglages.modifies, ...c.avances },
    },
  }
}

const STYLE_INFERIEUR: Record<Style, Style | null> = { confort: 'equilibre', equilibre: 'eco', eco: null }
const NOMS_STYLE: Record<Style, string> = { eco: 'Éco', equilibre: 'Équilibré', confort: 'Confort' }

/** Pistes d'économie possibles à partir des réglages actuels (sans les chiffrer). */
function pistes(entree: EntreeCouts): Omit<SuggestionEconomie, 'economie'>[] {
  const s = entree.reglages.simple
  const av = reglagesEffectifs(entree.reglages)
  const voyageurs = s.adultes + s.enfants
  const p: Omit<SuggestionEconomie, 'economie'>[] = []

  // Transport : un mode moins cher et possible
  for (const mode of MODES) {
    if (mode === s.transport) continue
    p.push({ id: `mode-${mode}`, poste: 'transport', titre: `Voyager en ${mode} plutôt qu’en ${s.transport}`, changement: { simple: { transport: mode } } })
  }
  if (av.classe !== 'eco' && (s.transport === 'train' || s.transport === 'avion')) p.push({ id: 'classe', poste: 'transport', titre: 'Voyager en classe économique', changement: { avances: { classe: 'eco' } } })
  if (av.bagagesSoute && s.transport === 'avion') p.push({ id: 'bagages', poste: 'transport', titre: 'Partir avec un bagage cabine seulement', changement: { avances: { bagagesSoute: false } } })

  // Logement
  if (av.typeLogement === 'hotel' && av.etoiles > 2) {
    const etoiles = (av.etoiles - 1) as 2 | 3
    p.push({ id: 'etoiles', poste: 'logement', titre: `Choisir un hôtel ${etoiles} étoiles au lieu de ${av.etoiles}`, changement: { avances: { etoiles } } })
  }
  if (voyageurs >= 3 && av.typeLogement === 'hotel') p.push({ id: 'appartement', poste: 'logement', titre: 'Louer un appartement pour tout le groupe', changement: { avances: { typeLogement: 'appartement', chambres: 1 } } })
  if (voyageurs <= 2 && av.typeLogement !== 'auberge' && av.typeLogement !== 'camping') p.push({ id: 'auberge', poste: 'logement', titre: 'Dormir en auberge de jeunesse', changement: { avances: { typeLogement: 'auberge' } } })
  if (av.quartier === 'centre') p.push({ id: 'quartier', poste: 'logement', titre: 'Loger dans un quartier plus calme, un peu excentré', changement: { avances: { quartier: 'calme' } } })
  if (av.petitDejeuner) p.push({ id: 'petitdej', poste: 'logement', titre: 'Prendre le petit-déjeuner hors de l’hôtel', changement: { avances: { petitDejeuner: false } } })

  // Repas
  if (av.niveauResto === 'gastronomique') p.push({ id: 'resto-niveau', poste: 'repas', titre: 'Préférer les bistrots aux restaurants gastronomiques', changement: { avances: { niveauResto: 'moyen' } } })
  else if (av.niveauResto === 'moyen') p.push({ id: 'resto-niveau', poste: 'repas', titre: 'Choisir des restaurants simples', changement: { avances: { niveauResto: 'simple' } } })
  if (av.restosParJour * av.partRestaurant > 0.25) {
    p.push({ id: 'resto-moins', poste: 'repas', titre: 'Manger deux fois moins souvent au restaurant (pique-nique, marché)', changement: { avances: { partRestaurant: Math.round(av.partRestaurant * 50) / 100 } } })
  }

  // Activités
  if (av.rythme > 1) p.push({ id: 'rythme', poste: 'activites', titre: 'Faire une activité payante de moins par jour', changement: { avances: { rythme: (av.rythme - 1) as 1 | 2 } } })
  if (!av.gratuitesUniquement && (av.budgetMaxActivite == null || av.budgetMaxActivite > 15)) p.push({ id: 'activite-max', poste: 'activites', titre: 'Se limiter aux activités à moins de 15 €', changement: { avances: { budgetMaxActivite: 15 } } })
  if (!av.gratuitesUniquement) p.push({ id: 'gratuites', poste: 'activites', titre: 'Ne garder que les visites gratuites', changement: { avances: { gratuitesUniquement: true } } })

  // Divers
  if (av.souvenirs) p.push({ id: 'souvenirs', poste: 'divers', titre: 'Faire une croix sur les souvenirs', changement: { avances: { souvenirs: false } } })
  if (av.tauxImprevus > 0.05) p.push({ id: 'imprevus', poste: 'imprevus', titre: 'Réduire la marge pour imprévus à 5 %', changement: { avances: { tauxImprevus: 0.05 } } })

  // Séjour
  if (s.nuits > 2) p.push({ id: 'nuit', poste: 'logement', titre: `Partir ${s.nuits - 1} nuits au lieu de ${s.nuits}`, changement: { simple: { nuits: s.nuits - 1 } } })
  const style = STYLE_INFERIEUR[s.style]
  if (style) p.push({ id: 'style', poste: 'logement', titre: `Passer au style ${NOMS_STYLE[style]}`, changement: { simple: { style } } })

  return p
}

/** Postes au-delà de leur part idéale : à économie égale, leurs pistes passent devant. Part de chaque poste au-delà de la répartition idéale (0 si dans les clous). */
function surPoids(estimation: EstimationCouts, rep: ReglagesAvances['repartition']): Partial<Record<Poste, number>> {
  const base = estimation.postes.transport + estimation.postes.logement + estimation.postes.repas + estimation.postes.activites
  if (base <= 0) return {}
  const r: Partial<Record<Poste, number>> = {}
  for (const poste of ['transport', 'logement', 'repas', 'activites'] as const) r[poste] = Math.max(0, estimation.postes[poste] / base - rep[poste])
  return r
}

/** Chiffre une piste ; une piste qui rend le transport impossible ou n'économise rien est écartée. */
function chiffrer(entree: EntreeCouts, totalActuel: number, piste: Omit<SuggestionEconomie, 'economie'>): SuggestionEconomie | null {
  const apres = estimerCouts(appliquerChangement(entree, piste.changement))
  if (!apres.transport.possible) return null
  const economie = totalActuel - apres.total
  return economie >= Math.max(5, totalActuel * 0.005) ? { ...piste, economie } : null
}

/**
 * Pistes d'économie chiffrées quand l'estimation dépasse le budget, et la combinaison
 * la plus courte pour revenir sous le budget (on applique la meilleure piste, on recalcule, etc.).
 */
export function ajusterAuBudget(entree: EntreeCouts, budget: number): AjustementBudget {
  const estimation = estimerCouts(entree)
  const totalInitial = estimation.total
  const rep = reglagesEffectifs(entree.reglages).repartition
  const poids = surPoids(estimation, rep)
  const classer = (a: SuggestionEconomie, b: SuggestionEconomie) => b.economie * (1 + (poids[b.poste] ?? 0)) - a.economie * (1 + (poids[a.poste] ?? 0))

  const suggestions = pistes(entree)
    .map((p) => chiffrer(entree, totalInitial, p))
    .filter((s): s is SuggestionEconomie => s !== null)
    .sort(classer)

  // On essaie d'abord sans changer de style (changement global), puis avec si nécessaire.
  const sansStyle = construirePlan(entree, totalInitial, budget, classer, false)
  const { plan, total } = sansStyle.total <= budget ? sansStyle : meilleurPlan(sansStyle, construirePlan(entree, totalInitial, budget, classer, true), budget)

  return {
    budget,
    totalInitial,
    depassement: Math.max(0, totalInitial - budget),
    suggestions,
    plan,
    totalApresPlan: total,
    atteignable: total <= budget,
  }
}

function construirePlan(
  entree: EntreeCouts,
  totalInitial: number,
  budget: number,
  classer: (a: SuggestionEconomie, b: SuggestionEconomie) => number,
  avecStyle: boolean,
): { plan: SuggestionEconomie[]; total: number } {
  const plan: SuggestionEconomie[] = []
  let courant = entree
  let total = totalInitial
  for (let i = 0; i < 12 && total > budget; i++) {
    const deja = new Set(plan.map((s) => s.id.replace(/^mode-.*/, 'mode')))
    const candidates = pistes(courant)
      .filter((p) => (avecStyle || p.id !== 'style') && !deja.has(p.id.replace(/^mode-.*/, 'mode')))
      .map((p) => chiffrer(courant, total, p))
      .filter((s): s is SuggestionEconomie => s !== null)
      .sort(classer)
    // La plus petite piste qui suffit à elle seule, sinon la plus efficace
    const suffisantes = candidates.filter((c) => total - c.economie <= budget).sort((a, b) => a.economie - b.economie)
    const choix = suffisantes[0] ?? candidates[0]
    if (!choix) break
    plan.push(choix)
    courant = appliquerChangement(courant, choix.changement)
    total -= choix.economie
  }
  return { plan, total }
}

/** Le plan qui tient le budget avec le moins de changements, sinon celui qui va le plus bas. */
function meilleurPlan(a: { plan: SuggestionEconomie[]; total: number }, b: { plan: SuggestionEconomie[]; total: number }, budget: number) {
  const okA = a.total <= budget
  const okB = b.total <= budget
  if (okA !== okB) return okA ? a : b
  if (okA) return a.plan.length <= b.plan.length ? a : b
  return a.total <= b.total ? a : b
}

/** Fusionne les changements d'un plan (pour « Appliquer ces économies »). */
export function fusionnerChangements(plan: SuggestionEconomie[]): Changement {
  return plan.reduce<Changement>(
    (acc, s) => ({ simple: { ...acc.simple, ...s.changement.simple }, avances: { ...acc.avances, ...s.changement.avances } }),
    { simple: {}, avances: {} },
  )
}
