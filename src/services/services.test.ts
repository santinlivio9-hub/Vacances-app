import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { avecCache, viderCache } from './cache'
import { coordonneesEnTexte, versLieu as lieuNominatim } from './nominatim'
import { calculerTrajet } from './osrm'
import { dedoublonner, requeteOverpass, typeDepuisTags, versLieuVisite } from './overpass'
import { versLieu as lieuPhoton } from './photon'
import { trouverLieux } from './lieux'
import { rechercherLieux } from './recherche'
import { creerLimiteur, enParallele } from './reseau'
import { lireReferenceWikipedia, resumeWikipedia, typeDepuisTitre } from './wikipedia'

const troyes = { lat: 48.2973, lon: 4.0744 }
const annecy = { lat: 45.8992, lon: 6.1294 }

/** Simule fetch : `routes` associe un morceau d'URL à une réponse (ou à une erreur). */
function simulerFetch(routes: [string, unknown | Error][]) {
  const appels: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      appels.push(url)
      const route = routes.find(([motif]) => url.includes(motif))
      if (!route || route[1] instanceof Error) throw route?.[1] ?? new TypeError('injoignable')
      return new Response(JSON.stringify(route[1]), { status: 200 })
    }),
  )
  return appels
}

beforeEach(() => viderCache())
afterEach(() => vi.unstubAllGlobals())

describe('cache', () => {
  it('n’appelle le service qu’une fois pour la même clé, même en parallèle', async () => {
    const charger = vi.fn(async () => 42)
    const [a, b] = await Promise.all([avecCache('k', charger), avecCache('k', charger)])
    expect(a).toBe(42)
    expect(b).toBe(42)
    expect(await avecCache('k', charger)).toBe(42)
    expect(charger).toHaveBeenCalledTimes(1)
  })

  it('ne met pas les échecs en cache', async () => {
    const charger = vi.fn().mockRejectedValueOnce(new Error('panne')).mockResolvedValueOnce('ok')
    await expect(avecCache('k2', charger)).rejects.toThrow('panne')
    expect(await avecCache('k2', charger)).toBe('ok')
  })
})

describe('réseau', () => {
  it('le limiteur espace les appels', async () => {
    const planifier = creerLimiteur(50)
    const debut = Date.now()
    await Promise.all([1, 2, 3].map(() => planifier(async () => Date.now())))
    expect(Date.now() - debut).toBeGreaterThanOrEqual(95)
  })

  it('enParallele garde l’ordre des résultats', async () => {
    expect(await enParallele([3, 1, 2], 2, async (n) => n * 10)).toEqual([30, 10, 20])
  })
})

describe('Photon et recherche d’adresse', () => {
  it('transforme une réponse Photon en lieu', () => {
    const lieu = lieuPhoton({ name: 'Lisbonne', state: 'Lisbonne', country: 'Portugal', countrycode: 'PT', type: 'city' }, [-9.14, 38.72])
    expect(lieu).toMatchObject({ nom: 'Lisbonne', detail: 'Portugal', pays: 'pt', lat: 38.72, lon: -9.14 })
  })

  it('compose une adresse avec numéro et rue', () => {
    const lieu = lieuPhoton({ street: 'Rue de la Paix', housenumber: '12', city: 'Paris', country: 'France', countrycode: 'FR' }, [2.33, 48.87])
    expect(lieu.nom).toBe('12 Rue de la Paix')
    expect(lieu.detail).toBe('Paris, France')
  })

  it('utilise Photon quand il répond', async () => {
    simulerFetch([['photon.komoot.io', { features: [{ geometry: { coordinates: [4.07, 48.29] }, properties: { name: 'Troyes', countrycode: 'FR' } }] }]])
    const r = await rechercherLieux('Troyes')
    expect(r.source).toBe('photon')
    expect(r.lieux[0].nom).toBe('Troyes')
  })

  it('se rabat sur les communes embarquées si Photon est en panne', async () => {
    const appels = simulerFetch([['photon.komoot.io', new TypeError('panne')]])
    const r = await rechercherLieux('Rosières-près-Troyes')
    expect(r.source).toBe('communes')
    expect(r.lieux[0]).toMatchObject({ nom: 'Rosières-près-Troyes', pays: 'fr', codePostal: '10430' })
    expect(appels.some((u) => u.includes('nominatim'))).toBe(false) // jamais d'autocomplétion sur Nominatim
  })

  it('n’interroge Nominatim qu’après validation de la saisie', async () => {
    simulerFetch([
      ['photon.komoot.io', new TypeError('panne')],
      ['nominatim.openstreetmap.org/search', [{ lat: '38.72', lon: '-9.14', name: 'Lisboa', display_name: 'Lisboa, Portugal', address: { country_code: 'pt', country: 'Portugal' } }]],
    ])
    expect((await rechercherLieux('Lisboa')).source).toBe('aucun')
    const valide = await rechercherLieux('Lisboa', { valide: true })
    expect(valide.source).toBe('nominatim')
    expect(valide.lieux[0].pays).toBe('pt')
  })

  it('ignore les saisies trop courtes', async () => {
    expect((await rechercherLieux('a')).lieux).toEqual([])
  })
})

describe('Nominatim', () => {
  it('transforme une adresse inversée en lieu', () => {
    const lieu = lieuNominatim({ lat: '45.89', lon: '6.12', display_name: 'Annecy, Haute-Savoie, France', address: { town: 'Annecy', state: 'Auvergne-Rhône-Alpes', country: 'France', country_code: 'fr', postcode: '74000' } })
    expect(lieu).toMatchObject({ nom: 'Annecy', pays: 'fr', codePostal: '74000' })
  })

  it('écrit des coordonnées lisibles en secours', () => {
    expect(coordonneesEnTexte({ lat: 48.2973, lon: -4.0744 })).toBe('48,297° N, 4,074° O')
  })
})

describe('OSRM', () => {
  it('lit la route renvoyée', async () => {
    simulerFetch([['router.project-osrm.org', { code: 'Ok', routes: [{ distance: 430_000, duration: 15_000, geometry: { coordinates: [[4.07, 48.3], [6.13, 45.9]] } }] }]])
    const t = await calculerTrajet(troyes, annecy)
    expect(t.approximatif).toBe(false)
    expect(t.distanceKm).toBe(430)
    expect(t.dureeMin).toBe(250)
    expect(t.trace[0]).toEqual([48.3, 4.07])
  })

  it('estime à vol d’oiseau × 1,25 si le service ne répond pas', async () => {
    simulerFetch([['router.project-osrm.org', new TypeError('panne')]])
    const t = await calculerTrajet(troyes, annecy)
    expect(t.approximatif).toBe(true)
    expect(t.distanceKm).toBeGreaterThan(300)
    expect(t.distanceKm).toBeLessThan(400)
  })

  it('estime aussi quand il n’y a pas de route (traversée de mer)', async () => {
    simulerFetch([['router.project-osrm.org', { code: 'NoRoute' }]])
    expect((await calculerTrajet(troyes, { lat: 40.71, lon: -74 })).approximatif).toBe(true)
  })
})

describe('Overpass', () => {
  it('construit une requête bornée dans l’espace et en nombre', () => {
    const q = requeteOverpass(annecy, 12000, true, 150)
    expect(q).toContain('around:12000,45.89920,6.12940')
    expect(q).toContain('["wikidata"]')
    expect(q).toContain('out center tags 150;')
  })

  it('classe les lieux selon leurs tags', () => {
    expect(typeDepuisTags({ tourism: 'museum' })).toBe('musee')
    expect(typeDepuisTags({ natural: 'beach' })).toBe('plage')
    expect(typeDepuisTags({ historic: 'castle' })).toBe('monument')
    expect(typeDepuisTags({ leisure: 'park' })).toBe('parc')
    expect(typeDepuisTags({ tourism: 'viewpoint' })).toBe('point_de_vue')
    expect(typeDepuisTags({ tourism: 'attraction' })).toBe('autre')
  })

  it('lit un élément (nœud ou chemin avec centre)', () => {
    const lieu = versLieuVisite({ type: 'way', id: 7, center: { lat: 45.9, lon: 6.13 }, tags: { name: 'Château d’Annecy', historic: 'castle', wikidata: 'Q1', fee: 'yes' } })
    expect(lieu).toMatchObject({ id: 'osm-way-7', type: 'monument', gratuit: false, source: 'osm' })
    expect(versLieuVisite({ type: 'node', id: 1, lat: 1, lon: 1, tags: {} })).toBeNull() // sans nom
  })

  it('supprime les doublons', () => {
    const a = { id: '1', nom: 'Lac', type: 'nature' as const, lat: 0, lon: 0, source: 'osm' as const, wikidata: 'Q9' }
    expect(dedoublonner([a, { ...a, id: '2' }, { ...a, id: '3', nom: 'Autre' }])).toHaveLength(1)
  })
})

describe('trouverLieux : replis', () => {
  const elements = Array.from({ length: 14 }, (_, i) => ({ type: 'node', id: i, lat: 45.9, lon: 6.1, tags: { name: `Lieu ${i}`, tourism: 'museum', wikidata: `Q${i}` } }))

  it('prend OpenStreetMap quand il répond', async () => {
    simulerFetch([['overpass-api.de', { elements }]])
    const r = await trouverLieux(annecy)
    expect(r.source).toBe('osm')
    expect(r.lieux).toHaveLength(14)
  })

  it('passe à Wikipédia si Overpass est en panne', async () => {
    simulerFetch([
      ['overpass-api.de', new TypeError('panne')],
      ['list=geosearch', { query: { geosearch: [{ pageid: 5, title: 'Musée-Château d’Annecy', lat: 45.89, lon: 6.12, dist: 300 }] } }],
    ])
    const r = await trouverLieux(annecy)
    expect(r.source).toBe('wikipedia')
    expect(r.lieux[0]).toMatchObject({ type: 'musee', wikipedia: 'fr:Musée-Château d’Annecy' })
  })

  it('renvoie une liste vide si tout est en panne (le moteur prendra des activités génériques)', async () => {
    simulerFetch([])
    expect(await trouverLieux(annecy)).toEqual({ lieux: [], source: 'aucun' })
  })
})

describe('Wikipédia', () => {
  it('lit les références « langue:titre »', () => {
    expect(lireReferenceWikipedia('en:Eiffel Tower')).toEqual({ langue: 'en', titre: 'Eiffel Tower' })
    expect(lireReferenceWikipedia('Annecy')).toEqual({ langue: 'fr', titre: 'Annecy' })
  })

  it('devine le type d’un lieu d’après son titre', () => {
    expect(typeDepuisTitre('Plage de Copacabana')).toBe('plage')
    expect(typeDepuisTitre('Cathédrale Notre-Dame')).toBe('monument')
    expect(typeDepuisTitre('Lac d’Annecy')).toBe('nature')
  })

  it('cherche en français puis en anglais, et ignore les pages d’homonymie', async () => {
    simulerFetch([
      ['fr.wikipedia.org/api/rest_v1/page/summary/Belem', { type: 'disambiguation', title: 'Belem', extract: '…' }],
      ['en.wikipedia.org/api/rest_v1/page/summary/Belem', { type: 'standard', title: 'Belém', extract: 'A district of Lisbon.', thumbnail: { source: 'https://upload.wikimedia.org/x.jpg' } }],
    ])
    const r = await resumeWikipedia('Belem')
    expect(r).toMatchObject({ langue: 'en', titre: 'Belém', image: 'https://upload.wikimedia.org/x.jpg' })
  })

  it('renvoie null sans planter si Wikipédia ne répond pas', async () => {
    simulerFetch([])
    expect(await resumeWikipedia('Annecy')).toBeNull()
  })
})
