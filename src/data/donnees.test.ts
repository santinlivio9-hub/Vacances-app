import { describe, expect, it } from 'vitest'
import { aeroports, destinations, tarifsTransport, villesDepart } from '.'
import type { Confort, ParConfort } from './types'

const CONFORTS: Confort[] = ['eco', 'moyen', 'confort']
const MODES = ['voiture', 'train', 'avion']
const TYPES = ['culture', 'nature', 'gastronomie', 'loisirs', 'excursion', 'plage', 'sport']

const croissant = (p: ParConfort) => p.eco < p.moyen && p.moyen < p.confort
const coordonneesValides = (lat: number, lon: number) => Math.abs(lat) <= 90 && Math.abs(lon) <= 180

describe('destinations.json', () => {
  it('contient 12 destinations : 4 en France, 5 en Europe, 3 lointaines', () => {
    expect(destinations).toHaveLength(12)
    expect(destinations.filter((d) => d.zone === 'france')).toHaveLength(4)
    expect(destinations.filter((d) => d.zone === 'europe')).toHaveLength(5)
    expect(destinations.filter((d) => d.zone === 'monde')).toHaveLength(3)
  })

  it('a des identifiants uniques', () => {
    expect(new Set(destinations.map((d) => d.id)).size).toBe(destinations.length)
  })

  it.each(destinations)('$nom : données cohérentes', (d) => {
    expect(coordonneesValides(d.lat, d.lon)).toBe(true)
    expect(d.description.length).toBeGreaterThan(20)
    expect(d.aeroport).toMatch(/^[A-Z]{3}$/)

    for (const poste of [d.logement, d.repas, d.activites]) {
      expect(croissant(poste)).toBe(true)
      for (const c of CONFORTS) expect(poste[c]).toBeGreaterThan(0)
    }
    expect(d.transportLocal).toBeGreaterThan(0)

    expect(d.saison.basse).toBeLessThan(d.saison.moyenne)
    expect(d.saison.moyenne).toBe(1)
    expect(d.saison.haute).toBeGreaterThan(d.saison.moyenne)

    const mois = [...d.moisHauteSaison, ...d.moisBasseSaison]
    expect(mois.every((m) => Number.isInteger(m) && m >= 1 && m <= 12)).toBe(true)
    expect(new Set(mois).size).toBe(mois.length) // un mois ne peut pas être à la fois haut et bas

    expect(d.modesDisponibles.length).toBeGreaterThan(0)
    expect(d.modesDisponibles.every((m) => MODES.includes(m))).toBe(true)

    expect(d.activitesSuggerees.length).toBeGreaterThanOrEqual(4)
    expect(d.activitesSuggerees.length).toBeLessThanOrEqual(6)
    for (const a of d.activitesSuggerees) {
      expect(a.prixIndicatif).toBeGreaterThanOrEqual(0)
      expect(TYPES).toContain(a.type)
    }
  })

  it('les destinations lointaines ne sont accessibles qu’en avion', () => {
    for (const d of destinations.filter((d) => d.zone === 'monde')) {
      expect(d.modesDisponibles).toEqual(['avion'])
    }
  })
})

describe('villesDepart.json', () => {
  it('contient les 9 villes rapides, dont Troyes', () => {
    expect(villesDepart).toHaveLength(9)
    expect(villesDepart.map((v) => v.nom)).toContain('Troyes')
  })

  it.each(villesDepart)('$nom est en France métropolitaine', (v) => {
    expect(v.lat).toBeGreaterThan(41)
    expect(v.lat).toBeLessThan(51.5)
    expect(v.lon).toBeGreaterThan(-5.5)
    expect(v.lon).toBeLessThan(10)
    expect(v.codePostal).toMatch(/^\d{5}$/)
  })
})

describe('aeroports.json', () => {
  it('a des codes IATA uniques', () => {
    expect(aeroports.every((a) => /^[A-Z]{3}$/.test(a.code))).toBe(true)
    expect(new Set(aeroports.map((a) => a.code)).size).toBe(aeroports.length)
  })
})

describe('transport.json', () => {
  it('a des tarifs positifs et des tranches avion ordonnées', () => {
    const { voiture, train, avion } = tarifsTransport
    expect(tarifsTransport.coefficientDetour).toBe(1.2)
    expect(voiture.placesParVehicule).toBe(4)
    expect(train.minimumParTrajet).toBeLessThan(train.plafondParTrajet)

    const limites = avion.tranches.map((t) => t.jusquaKm)
    expect(limites.at(-1)).toBeNull()
    const finies = limites.slice(0, -1) as number[]
    expect(finies).toEqual([...finies].sort((a, b) => a - b))
    expect(avion.coefficientSaison.haute).toBeGreaterThan(1)
  })
})
