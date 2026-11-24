import type { Coordonnees, LieuVisite, ResumeWikipedia, TypeActivite } from '../domain/types'
import { avecCache } from './cache'
import { lireJson } from './reseau'

/**
 * Wikipédia : résumés et photos (API REST page/summary), et recherche de lieux autour
 * d'un point (geosearch). Gratuit, sans clé, CORS ouvert. Les textes sont sous licence CC BY-SA :
 * on affiche toujours le lien vers l'article.
 */
type Langue = 'fr' | 'en'

interface ReponseResume {
  type?: string
  title: string
  extract?: string
  thumbnail?: { source: string }
  content_urls?: { desktop?: { page?: string } }
}

interface ReponseGeosearch {
  query?: { geosearch: { pageid: number; title: string; lat: number; lon: number; dist: number }[] }
}

/** « fr:Tour Eiffel » → { langue: 'fr', titre: 'Tour Eiffel' } */
export function lireReferenceWikipedia(reference: string): { langue: Langue; titre: string } {
  const correspondance = /^(fr|en):(.+)$/.exec(reference)
  return correspondance ? { langue: correspondance[1] as Langue, titre: correspondance[2] } : { langue: 'fr', titre: reference }
}

async function resumeDansLangue(titre: string, langue: Langue, signal?: AbortSignal): Promise<ResumeWikipedia | null> {
  return avecCache(`wiki-resume:${langue}:${titre}`, async () => {
    const url = `https://${langue}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titre.replaceAll(' ', '_'))}`
    try {
      const r = await lireJson<ReponseResume>(url, { service: 'Wikipédia', delaiMs: 6000, signal })
      if (r.type === 'disambiguation' || !r.extract) return null
      return {
        titre: r.title,
        extrait: r.extract,
        // Les images SVG sont des drapeaux, blasons ou logos : pas de vraies photos
        image: r.thumbnail?.source && !/\.svg\//i.test(r.thumbnail.source) ? r.thumbnail.source : undefined,
        lien: r.content_urls?.desktop?.page ?? `https://${langue}.wikipedia.org/wiki/${encodeURIComponent(titre)}`,
        langue,
      }
    } catch (erreur) {
      if (signal?.aborted) throw erreur
      return null // article introuvable : on renvoie null (mis en cache) plutôt que de réessayer
    }
  })
}

/** Résumé d'un article : la langue indiquée (ou le français), puis l'anglais. */
export async function resumeWikipedia(reference: string, signal?: AbortSignal): Promise<ResumeWikipedia | null> {
  const { langue, titre } = lireReferenceWikipedia(reference)
  const premier = await resumeDansLangue(titre, langue, signal)
  if (premier || langue === 'en') return premier
  return resumeDansLangue(titre, 'en', signal)
}

/** Devine le type d'un lieu Wikipédia d'après son titre (pas de tags comme dans OSM). */
export function typeDepuisTitre(titre: string): TypeActivite {
  const t = titre.toLowerCase()
  if (/mus[ée]e|museum|galerie|gallery/.test(t)) return 'musee'
  if (/plage|beach|praia|playa|spiaggia/.test(t)) return 'plage'
  if (/parc|jardin|park|garden|bois/.test(t)) return 'parc'
  if (/zoo|aquarium/.test(t)) return 'zoo'
  if (/th[ée][âa]tre|op[ée]ra|theatre/.test(t)) return 'spectacle'
  if (/march[ée]|market/.test(t)) return 'marche'
  if (/lac|mont|cascade|gorges|lake|mount/.test(t)) return 'nature'
  if (/ch[âa]teau|[ée]glise|cath[ée]drale|basilique|tour|pont|palais|abbaye|castle|church|cathedral|palace|tower|bridge/.test(t)) return 'monument'
  return 'autre'
}

/** Articles géolocalisés autour d'un point (rayon max 10 km imposé par l'API). */
export async function lieuxWikipedia(centre: Coordonnees, rayonKm: number, signal?: AbortSignal): Promise<LieuVisite[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${centre.lat.toFixed(4)}|${centre.lon.toFixed(4)}`,
    gsradius: String(Math.min(10000, Math.round(rayonKm * 1000))),
    gslimit: '40',
    format: 'json',
    origin: '*',
  })
  return avecCache(`wiki-geo:${params}`, async () => {
    const r = await lireJson<ReponseGeosearch>(`https://fr.wikipedia.org/w/api.php?${params}`, { service: 'Wikipédia', signal })
    return (r.query?.geosearch ?? []).map((g) => ({
      id: `wiki-${g.pageid}`,
      nom: g.title,
      type: typeDepuisTitre(g.title),
      lat: g.lat,
      lon: g.lon,
      wikipedia: `fr:${g.title}`,
      source: 'wikipedia' as const,
    }))
  })
}
