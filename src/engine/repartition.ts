import type { PosteDepense, ReglagesRepartition, Voyageur } from '../domain/types'

/**
 * Qui paie quoi. Le coût (ce que consomme chacun) et le paiement (qui règle) sont séparés :
 * 1. chaque dépense est d'abord attribuée aux voyageurs qui y participent, selon leur poids de coût
 *    (enfant 70 % des repas et activités, bébé gratuit pour le logement et le train…) ;
 * 2. la part de ceux qui ne la paient pas est redistribuée entre ceux qui la paient (à parts égales,
 *    ou selon leur poids en mode Avancé) ;
 * 3. les montants fixes et pourcentages sont déduits en premier ; le reste est réparti entre ceux
 *    qui « paient leur part ».
 * Tout est arrondi au centime et la somme des parts vaut toujours le total ; l'écart d'arrondi va au premier payeur.
 */

export const POSTES_DEPENSE: PosteDepense[] = ['transport', 'logement', 'repas', 'activites', 'transportLocal', 'divers', 'imprevus']

export const NOMS_POSTES: Record<PosteDepense, string> = {
  transport: 'Transport',
  logement: 'Logement',
  repas: 'Repas',
  activites: 'Activités',
  transportLocal: 'Transport sur place',
  divers: 'Souvenirs et divers',
  imprevus: 'Imprévus',
}

/** Part d'un enfant dans les repas, activités et souvenirs (même valeur que le moteur de coûts) */
export const PART_ENFANT = 0.7
/** Part d'un bébé (moins de 2 ans) dans les repas et souvenirs ; logement, train et activités gratuits */
export const PART_BEBE_REPAS = 0.3
/** Un bébé paie environ 10 % d'un billet d'avion (sur les genoux) */
export const PART_BEBE_AVION = 0.1

export interface ActiviteRepartie {
  id: string
  nom: string
  /** Prix pour tout le groupe, en euros */
  prix: number
}

export interface VoyagePourRepartition {
  postes: Partial<Record<PosteDepense, number>>
  /** Activités payantes de l'itinéraire : elles remplacent (à hauteur de leur prix) le poste « activités » */
  activites?: ActiviteRepartie[]
  /** Le transport est-il un vol ? (part d'un bébé) */
  avion?: boolean
}

export interface LigneRepartition {
  /** Poste, id d'activité, « fixe » ou « pourcentage » */
  id: string
  libelle: string
  montant: number
  /** Part de la dépense payée par ce voyageur (0 à 1) ; absent pour fixe et pourcentage */
  fraction?: number
  activite?: boolean
}

export interface PartVoyageur {
  id: string
  nom: string
  /** Ce qu'il paie, en euros, au centime */
  montant: number
  /** Ce que coûte sa propre participation au voyage (même s'il ne paie pas) */
  coutPropre: number
  lignes: LigneRepartition[]
  explication: string
}

export type ResultatRepartition = { ok: true; total: number; parts: PartVoyageur[] } | { ok: false; total: number; erreur: string; parts: PartVoyageur[] }

/** « Adulte 1 », « Enfant 2 »… quand le prénom n'est pas renseigné. */
export function nomVoyageur(v: Voyageur, tous: Voyageur[]): string {
  if (v.prenom?.trim()) return v.prenom.trim()
  const memes = tous.filter((x) => x.type === v.type)
  const n = memes.indexOf(v) + 1
  return `${v.type === 'adulte' ? 'Adulte' : v.type === 'enfant' ? 'Enfant' : 'Bébé'} ${n || 1}`
}

/** Voyageurs par défaut : les adultes paient leur part, les enfants et bébés ne paient rien. */
export function voyageursParDefaut(adultes: number, enfants: number, bebes = 0, existants: Voyageur[] = []): Voyageur[] {
  const prendre = (type: Voyageur['type'], n: number) => {
    const deja = existants.filter((v) => v.type === type).slice(0, n)
    const nouveaux = Array.from({ length: n - deja.length }, (_, i): Voyageur => ({
      id: `${type}-${Date.now().toString(36)}-${deja.length + i}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      paiement: type === 'adulte' ? 'part' : 'rien',
      ...(type === 'enfant' ? { age: 8 } : type === 'bebe' ? { age: 1 } : {}),
    }))
    return [...deja, ...nouveaux]
  }
  return [...prendre('adulte', Math.max(0, adultes)), ...prendre('enfant', Math.max(0, enfants)), ...prendre('bebe', Math.max(0, bebes))]
}

/** Poids de coût d'un voyageur pour une dépense (1 = un adulte). */
export function poidsCout(v: Voyageur, poste: PosteDepense, avion = false): number {
  if (v.type === 'adulte') return 1
  if (v.type === 'enfant') return poste === 'repas' || poste === 'activites' || poste === 'divers' ? PART_ENFANT : 1
  // Bébé
  if (poste === 'transport') return avion ? PART_BEBE_AVION : 0
  if (poste === 'repas' || poste === 'divers') return PART_BEBE_REPAS
  return 0
}

interface Depense {
  id: string
  libelle: string
  poste: PosteDepense
  montant: number
  activite?: boolean
}

/** Liste des dépenses : un poste = une dépense, sauf les activités, détaillées une par une. */
export function depensesDuVoyage(voyage: VoyagePourRepartition): Depense[] {
  const res: Depense[] = []
  for (const poste of POSTES_DEPENSE) {
    const montant = Math.max(0, voyage.postes[poste] ?? 0)
    if (poste !== 'activites' || !voyage.activites?.length) {
      if (montant > 0) res.push({ id: poste, libelle: NOMS_POSTES[poste], poste, montant })
      continue
    }
    // Activités nommées, ramenées au poste si elles le dépassent ; le reste en « autres activités »
    const somme = voyage.activites.reduce((t, a) => t + Math.max(0, a.prix), 0)
    const k = somme > montant && somme > 0 ? montant / somme : 1
    for (const a of voyage.activites) if (a.prix > 0) res.push({ id: a.id, libelle: a.nom, poste, montant: a.prix * k, activite: true })
    const reste = montant - somme * k
    if (reste > 0.005) res.push({ id: 'activites', libelle: 'Autres activités', poste, montant: reste })
  }
  return res
}

const centimes = (e: number) => Math.round(e * 100)

/** « 1/3 », « 1/2 », ou « 42 % » ; chaîne vide pour la totalité. */
export function fractionLisible(f: number): string {
  if (f >= 0.995) return ''
  for (let n = 2; n <= 12; n++) if (Math.abs(f - 1 / n) < 0.004) return `1/${n}`
  for (const [a, b] of [[2, 3], [3, 4], [2, 5], [3, 5]] as const) if (Math.abs(f - a / b) < 0.004) return `${a}/${b}`
  return `${Math.round(f * 100)} %`
}

export function calculerRepartition(voyage: VoyagePourRepartition, voyageurs: Voyageur[], regles: ReglagesRepartition = {}): ResultatRepartition {
  const depenses = depensesDuVoyage(voyage)
  const totalC = depenses.reduce((t, d) => t + centimes(d.montant), 0)
  // Le total est la somme des postes arrondie au centime
  const total = totalC / 100
  const echec = (erreur: string): ResultatRepartition => ({ ok: false, total, erreur, parts: [] })

  if (voyageurs.length === 0) return echec('Ajoutez au moins un voyageur.')
  const ids = new Set(voyageurs.map((v) => v.id))
  const fixes = voyageurs.filter((v) => v.paiement === 'fixe')
  const pourcents = voyageurs.filter((v) => v.paiement === 'pourcentage')
  const sommePct = pourcents.reduce((t, v) => t + Math.max(0, v.pourcentage ?? 0), 0)
  if (sommePct > 100 + 1e-9) return echec(`Les pourcentages dépassent 100 % (${Math.round(sommePct)} %).`)
  const montantFixe = (v: Voyageur) => (v.paiement === 'fixe' ? Math.max(0, v.montant ?? 0) : v.paiement === 'pourcentage' ? (total * Math.max(0, v.pourcentage ?? 0)) / 100 : 0)
  const F = [...fixes, ...pourcents].reduce((t, v) => t + montantFixe(v), 0)
  if (F > total + 0.005) return echec(`Les montants fixes et pourcentages (${F.toFixed(2).replace('.', ',')} €) dépassent le total du voyage (${total.toFixed(2).replace('.', ',')} €).`)
  const payeursPossibles = voyageurs.filter((v) => v.paiement === 'part' || v.paiement === 'postes' || ((v.paiement === 'fixe' || v.paiement === 'pourcentage') && montantFixe(v) > 0))
  const payeursActivites = Object.values(regles.activites ?? {}).some((r) => r.payeurs?.some((id) => ids.has(id)))
  if (total > 0 && payeursPossibles.length === 0 && !payeursActivites) return echec('Personne ne paie : choisissez au moins un voyageur qui « paie sa part ».')

  const complets = voyageurs.filter((v) => v.paiement === 'part')
  const poidsRedistribution = (v: Voyageur) => Math.max(0, v.poids ?? 1)
  // Lignes par voyageur, en euros non arrondis
  const lignes = new Map<string, Map<string, LigneRepartition>>(voyageurs.map((v) => [v.id, new Map()]))
  const coutPropre = new Map<string, number>(voyageurs.map((v) => [v.id, 0]))
  let nonAttribue = 0
  const ajouter = (id: string, d: Depense, montant: number) => {
    if (montant <= 0) return
    const m = lignes.get(id)!
    const l = m.get(d.id) ?? { id: d.id, libelle: d.libelle, montant: 0, fraction: 0, activite: d.activite }
    l.montant += montant
    l.fraction = d.montant > 0 ? l.montant / d.montant : 0
    m.set(d.id, l)
  }

  // Parts de coût de chaque dépense (les imprévus suivent la part de chacun dans le reste)
  const partsCout = (d: Depense, participants: Voyageur[]): Map<string, number> => {
    const res = new Map<string, number>()
    if (d.poste === 'imprevus') {
      const base = participants.reduce((t, v) => t + coutPropre.get(v.id)!, 0)
      for (const v of participants) res.set(v.id, base > 0 ? (d.montant * coutPropre.get(v.id)!) / base : d.montant / participants.length)
      return res
    }
    if (d.poste === 'logement' && regles.logementParChambre && regles.chambres?.length) {
      // Chaque chambre coûte autant ; à l'intérieur, partage selon les poids de coût
      const dansChambre = new Set(regles.chambres.flat())
      const chambres = [...regles.chambres.map((c) => participants.filter((v) => c.includes(v.id))), ...participants.filter((v) => !dansChambre.has(v.id)).map((v) => [v])].filter((c) => c.length > 0)
      for (const c of chambres) {
        const w = c.map((v) => poidsCout(v, 'logement', voyage.avion))
        const sw = w.reduce((a, b) => a + b, 0)
        c.forEach((v, i) => res.set(v.id, ((d.montant / chambres.length) * (sw > 0 ? w[i] / sw : 1 / c.length))))
      }
      return res
    }
    const w = participants.map((v) => poidsCout(v, d.poste, voyage.avion))
    const sw = w.reduce((a, b) => a + b, 0)
    participants.forEach((v, i) => res.set(v.id, sw > 0 ? (d.montant * w[i]) / sw : d.montant / participants.length))
    return res
  }

  // Les imprévus en dernier : ils dépendent de la part de chacun dans le reste
  const ordre = [...depenses.filter((d) => d.poste !== 'imprevus'), ...depenses.filter((d) => d.poste === 'imprevus')]
  for (const d of ordre) {
    const regle = d.activite || d.id === 'activites' ? regles.activites?.[d.id] : undefined
    const listeParticipants = regle?.participants?.filter((id) => ids.has(id))
    let participants = listeParticipants?.length ? voyageurs.filter((v) => listeParticipants.includes(v.id)) : voyageurs
    // Un bébé ne « participe » pas à ce qui lui est gratuit, sauf s'il est seul
    const avecPoids = participants.filter((v) => poidsCout(v, d.poste, voyage.avion) > 0)
    if (avecPoids.length > 0 && d.poste !== 'imprevus' && !(d.poste === 'logement' && regles.logementParChambre)) participants = avecPoids
    const cout = partsCout(d, participants)
    for (const [id, c] of cout) coutPropre.set(id, coutPropre.get(id)! + c)

    const payeursExplicites = regle?.payeurs?.filter((id) => ids.has(id))
    const explicite = !!payeursExplicites?.length
    // Qui règle sa propre part de cette dépense ?
    const regleSaPart = (v: Voyageur) => (explicite ? payeursExplicites!.includes(v.id) : v.paiement === 'part' || (v.paiement === 'postes' && (v.postes ?? []).includes(d.poste)))
    // Qui reprend la part des autres ?
    // Ceux qui paient leur part (et payeurs de cette dépense) ; sinon ceux qui y participent ; sinon tous ; sinon les payeurs cochés
    let receveurs = explicite ? complets.filter((v) => payeursExplicites!.includes(v.id)) : []
    if (receveurs.length === 0) receveurs = complets.filter((v) => participants.includes(v))
    if (receveurs.length === 0) receveurs = complets
    if (receveurs.length === 0 && explicite) receveurs = voyageurs.filter((v) => payeursExplicites!.includes(v.id))
    let reste = 0
    for (const v of participants) {
      const c = cout.get(v.id) ?? 0
      if (regleSaPart(v)) ajouter(v.id, d, c)
      else reste += c
    }
    if (reste <= 0) continue
    const pw = receveurs.map(poidsRedistribution)
    const spw = pw.reduce((a, b) => a + b, 0)
    if (receveurs.length === 0) nonAttribue += reste
    else receveurs.forEach((v, i) => ajouter(v.id, d, reste * (spw > 0 ? pw[i] / spw : 1 / receveurs.length)))
  }

  // Montants fixes et pourcentages déduits en premier : ils allègent ceux qui paient leur part
  const sommeComplets = complets.reduce((t, v) => t + [...lignes.get(v.id)!.values()].reduce((a, l) => a + l.montant, 0), 0)
  const aCouvrir = sommeComplets + nonAttribue
  if (F > aCouvrir + 0.005) {
    return echec(`Les montants fixes et pourcentages (${F.toFixed(2).replace('.', ',')} €) dépassent ce qu’il reste à payer une fois les parts de chacun réglées (${aCouvrir.toFixed(2).replace('.', ',')} €).`)
  }
  if (sommeComplets <= 0.005 && aCouvrir - F > 0.005) {
    return echec(`Personne ne paie le reste (${(aCouvrir - F).toFixed(2).replace('.', ',')} €) : choisissez au moins un voyageur qui « paie sa part ».`)
  }
  if (sommeComplets > 0) {
    const k = (aCouvrir - F) / sommeComplets
    for (const v of complets) for (const l of lignes.get(v.id)!.values()) {
      l.montant *= k
      l.fraction = (l.fraction ?? 0) * k
    }
  }
  for (const v of [...fixes, ...pourcents]) {
    const m = montantFixe(v)
    if (m > 0) lignes.get(v.id)!.set(v.paiement, { id: v.paiement, libelle: v.paiement === 'fixe' ? 'Montant fixe' : `${Math.round((v.pourcentage ?? 0) * 10) / 10} % du total`, montant: m })
  }

  // Arrondi au centime, écart au premier payeur
  const parts: PartVoyageur[] = voyageurs.map((v) => {
    const ls = [...lignes.get(v.id)!.values()].filter((l) => l.montant > 0.0001)
    const montant = centimes(ls.reduce((t, l) => t + l.montant, 0))
    return { id: v.id, nom: nomVoyageur(v, voyageurs), montant, coutPropre: Math.round(coutPropre.get(v.id)! * 100) / 100, lignes: ls, explication: '' }
  })
  const ecart = totalC - parts.reduce((t, p) => t + p.montant, 0)
  if (ecart !== 0) {
    const premier = parts.find((p) => p.montant > 0) ?? parts.find((p) => voyageurs.find((v) => v.id === p.id)!.paiement === 'part') ?? parts[0]
    premier.montant += ecart
  }
  for (const p of parts) {
    // Lignes arrondies, ajustées pour tomber juste sur le montant du voyageur
    const lc = p.lignes.map((l) => centimes(l.montant))
    const d = p.montant - lc.reduce((a, b) => a + b, 0)
    if (d !== 0) {
      if (lc.length === 0) p.lignes.push({ id: 'arrondi', libelle: 'Arrondi', montant: 0 }), lc.push(0)
      const i = lc.indexOf(Math.max(...lc))
      lc[i] += d
    }
    p.lignes = p.lignes.map((l, i) => ({ ...l, montant: lc[i] / 100 })).sort((a, b) => b.montant - a.montant)
    p.montant /= 100
    p.explication = expliquer(p, voyageurs.find((v) => v.id === p.id)!)
  }
  return { ok: true, total, parts }
}

function expliquer(p: PartVoyageur, v: Voyageur): string {
  if (p.montant === 0) return v.type === 'adulte' ? 'Invité : ne paie rien' : 'Gratuit : ne paie rien'
  return p.lignes
    .map((l) => {
      if (l.id === 'fixe') return `Montant fixe`
      if (l.id === 'pourcentage') return l.libelle
      const f = fractionLisible(l.fraction ?? 1)
      const nom = l.activite ? l.libelle : l.libelle.charAt(0).toLowerCase() + l.libelle.slice(1)
      return f ? `${nom} ${f}` : nom
    })
    .join(' + ')
    .replace(/^./, (c) => c.toUpperCase())
}
