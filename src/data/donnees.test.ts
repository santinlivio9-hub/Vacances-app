import { describe, expect, it } from 'vitest'
import { continentDepuisPosition, continents, donneesPays, prixBase, tarifs, tousLesPays } from '.'

const STYLES = ['eco', 'equilibre', 'confort'] as const

describe('pays.json', () => {
  it('couvre au moins 60 pays et tous les continents', () => {
    expect(Object.keys(tousLesPays).length).toBeGreaterThanOrEqual(60)
    expect(Object.keys(continents)).toEqual(
      expect.arrayContaining(['europe', 'afrique', 'asie', 'amerique_nord', 'amerique_sud', 'oceanie']),
    )
  })

  it('a la France comme base 1,0', () => {
    expect(tousLesPays.fr.indice).toBe(1)
  })

  it.each(Object.entries({ ...tousLesPays, ...continents }))('%s : données cohérentes', (_, p) => {
    expect(p.indice).toBeGreaterThan(0.2)
    expect(p.indice).toBeLessThan(2.5)
    expect(p.saison.basse).toBeLessThan(1)
    expect(p.saison.moyenne).toBe(1)
    expect(p.saison.haute).toBeGreaterThan(1)
    const mois = [...p.moisHauteSaison, ...p.moisBasseSaison]
    expect(mois.every((m) => m >= 1 && m <= 12)).toBe(true)
    expect(new Set(mois).size).toBe(mois.length)
  })

  it('chaque pays pointe vers un continent connu', () => {
    for (const p of Object.values(tousLesPays)) expect(continents).toHaveProperty(p.continent)
  })
})

describe('donneesPays', () => {
  it('renvoie le pays s’il est connu', () => {
    const pt = donneesPays('PT', { lat: 38.7, lon: -9.1 })
    expect(pt.nom).toBe('Portugal')
    expect(pt.estimationContinent).toBe(false)
  })

  it('se rabat sur le continent pour un pays absent de la base', () => {
    // Bolivie (bo) n'est pas dans la base
    const bo = donneesPays('bo', { lat: -16.5, lon: -68.15 })
    expect(bo.estimationContinent).toBe(true)
    expect(bo.continent).toBe('amerique_sud')
    expect(bo.indice).toBe(continents.amerique_sud.indice)
  })

  it('devine le continent sans code pays', () => {
    expect(continentDepuisPosition({ lat: 48.85, lon: 2.35 })).toBe('europe')
    expect(continentDepuisPosition({ lat: 35.68, lon: 139.69 })).toBe('asie')
    expect(continentDepuisPosition({ lat: 40.71, lon: -74 })).toBe('amerique_nord')
    expect(continentDepuisPosition({ lat: -33.87, lon: 151.2 })).toBe('oceanie')
    expect(continentDepuisPosition({ lat: -1.29, lon: 36.82 })).toBe('afrique')
    expect(continentDepuisPosition({ lat: 25.2, lon: 55.27 })).toBe('moyen_orient')
    expect(continentDepuisPosition({ lat: -12.05, lon: -77.04 })).toBe('amerique_sud')
  })
})

describe('prixBase.json', () => {
  it('a des prix croissants avec le confort', () => {
    const series = [
      ...Object.entries(prixBase.logement).filter(([k]) => !['supplementCentre', 'remiseCalme', '_unite', 'serviceAirbnb', 'taxeSejour'].includes(k)),
      ...Object.entries(prixBase.sejourLong.loyerMensuel),
      ['coursesMois', prixBase.sejourLong.coursesMois],
      ['sortiesMois', prixBase.sejourLong.sortiesMois],
      ['courses', prixBase.repas.courses],
      ['snack', prixBase.repas.snack],
      ['transports', prixBase.transportLocal.transports],
    ] as [string, Record<string, number>][]
    for (const [nom, prix] of series) {
      expect(prix.eco, nom).toBeLessThanOrEqual(prix.equilibre)
      expect(prix.equilibre, nom).toBeLessThanOrEqual(prix.confort)
    }
  })

  it('a un prix pour chaque type d’activité et chaque style', () => {
    const types = ['musee', 'monument', 'parc', 'plage', 'point_de_vue', 'zoo', 'parc_attractions', 'visite_guidee', 'nature', 'spectacle', 'marche', 'autre'] as const
    for (const t of types) for (const s of STYLES) expect(prixBase.activites[t][s], t).toBeGreaterThanOrEqual(0)
  })

  it('classe les hôtels par étoiles', () => {
    const { hotel2, hotel3, hotel4 } = prixBase.logement
    expect(hotel2.equilibre).toBeLessThan(hotel3.equilibre)
    expect(hotel3.equilibre).toBeLessThan(hotel4.equilibre)
  })
})

describe('transport.json', () => {
  it('a des seuils de réalisme cohérents', () => {
    expect(tarifs.avion.distanceMinKm).toBeLessThan(tarifs.train.distanceMaxKm)
    expect(tarifs.car.distanceMaxKm).toBeLessThanOrEqual(tarifs.voiture.distanceMaxKm)
    expect(tarifs.avion.tranches.at(-1)?.jusquaKm).toBeNull()
    expect(tarifs.avion.coefficientSaison.haute).toBeGreaterThan(1)
  })
})

describe('destinations populaires', () => {
  it('ont toutes un pays connu de la base et des coordonnées valides', async () => {
    const { destinationsPopulaires } = await import('.')
    expect(destinationsPopulaires.length).toBeGreaterThanOrEqual(8)
    for (const d of destinationsPopulaires) {
      expect(tousLesPays, d.nom).toHaveProperty(d.pays)
      expect(Math.abs(d.lat)).toBeLessThanOrEqual(90)
      expect(d.wikipedia).toMatch(/^fr:/)
    }
  })
})
