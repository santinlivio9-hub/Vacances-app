import type { Coordonnees } from '../data/types'

/** Format compact produit par scripts/generer-communes.mjs */
export interface CommunesCompactes {
  noms: string
  codesPostaux: string
  lat: number[]
  lon: number[]
  population: number[]
}

export interface Commune extends Coordonnees {
  nom: string
  codesPostaux: string[]
  /** Classe de population (4 × log10), sert à classer les résultats */
  classe: number
  /** Nom normalisé, pour la recherche */
  cle: string
}

export function decoderCommunes(donnees: CommunesCompactes): Commune[] {
  const noms = donnees.noms.split('|')
  const codes = donnees.codesPostaux.split('|')
  let lat = 0
  let lon = 0
  return noms.map((nom, i) => {
    lat += donnees.lat[i]
    lon += donnees.lon[i]
    return {
      nom,
      codesPostaux: codes[i].split(' '),
      lat: lat / 100,
      lon: lon / 100,
      classe: donnees.population[i],
      cle: normaliser(nom),
    }
  })
}

/** Minuscules, sans accents ni tirets, « st » → « saint ». */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(st|ste)\b/g, (m) => (m === 'st' ? 'saint' : 'sainte'))
    .trim()
}

/** Plus petit = mieux : début du nom, puis début d'un mot, puis n'importe où. */
function rang(commune: Commune, requete: string): number | null {
  if (commune.cle.startsWith(requete)) return 0
  if (commune.cle.includes(` ${requete}`)) return 1
  if (commune.cle.includes(requete)) return 2
  return null
}

/** À rang égal, les villes les plus peuplées d'abord ; un nom exact gagne un petit bonus. */
function poids(commune: Commune, requete: string): number {
  return commune.classe + (commune.cle === requete ? 2 : 0)
}

/** Recherche par nom (tolère accents, tirets, « St ») ou par code postal. */
export function rechercherCommunes(communes: Commune[], texte: string, limite = 8): Commune[] {
  const requete = normaliser(texte)
  if (requete.length === 0) return []

  if (/^\d+$/.test(requete)) {
    return communes
      .filter((c) => c.codesPostaux.some((cp) => cp.startsWith(requete)))
      .sort((a, b) => b.classe - a.classe)
      .slice(0, limite)
  }

  const trouvees: { commune: Commune; rang: number; poids: number }[] = []
  for (const commune of communes) {
    const r = rang(commune, requete)
    if (r !== null) trouvees.push({ commune, rang: r, poids: poids(commune, requete) })
  }
  return trouvees
    .sort((a, b) => a.rang - b.rang || b.poids - a.poids || a.commune.nom.length - b.commune.nom.length)
    .slice(0, limite)
    .map((t) => t.commune)
}
