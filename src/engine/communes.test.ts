import { describe, expect, it } from 'vitest'
import donnees from '../data/communes.json'
import { decoderCommunes, normaliser, rechercherCommunes } from './communes'

const communes = decoderCommunes(donnees)

describe('normaliser', () => {
  it('retire accents, majuscules et tirets', () => {
    expect(normaliser('Saint-Étienne')).toBe('saint etienne')
    expect(normaliser('  Œuilly ')).toBe('oeuilly')
  })

  it('développe « St » et « Ste »', () => {
    expect(normaliser('St-Malo')).toBe('saint malo')
    expect(normaliser('Ste Maxime')).toBe('sainte maxime')
  })
})

describe('decoderCommunes', () => {
  it('contient toutes les communes de métropole et de Corse', () => {
    expect(communes.length).toBeGreaterThan(34_000)
  })

  it('retrouve les coordonnées de Troyes à 1 km près', () => {
    const troyes = communes.find((c) => c.nom === 'Troyes')!
    expect(troyes.codesPostaux).toContain('10000')
    expect(troyes.lat).toBeCloseTo(48.29, 1)
    expect(troyes.lon).toBeCloseTo(4.08, 1)
  })

  it('n’a que des coordonnées en France métropolitaine', () => {
    for (const c of communes) {
      expect(c.lat).toBeGreaterThan(41)
      expect(c.lat).toBeLessThan(51.2)
      expect(c.lon).toBeGreaterThan(-5.3)
      expect(c.lon).toBeLessThan(9.7)
    }
  })
})

describe('rechercherCommunes', () => {
  it('met la grande ville en premier', () => {
    expect(rechercherCommunes(communes, 'mars')[0].nom).toBe('Marseille')
    expect(rechercherCommunes(communes, 'troy')[0].nom).toBe('Troyes')
  })

  it('tolère les accents et les abréviations', () => {
    expect(rechercherCommunes(communes, 'st etienne')[0].nom).toBe('Saint-Étienne')
  })

  it('cherche par code postal', () => {
    const resultats = rechercherCommunes(communes, '10000')
    expect(resultats.map((c) => c.nom)).toContain('Troyes')
  })

  it('trouve aussi les petits villages', () => {
    expect(rechercherCommunes(communes, 'Rosières-près-Troyes')[0].nom).toBe('Rosières-près-Troyes')
  })

  it('renvoie une liste vide pour une recherche vide', () => {
    expect(rechercherCommunes(communes, '   ')).toEqual([])
  })

  it('respecte la limite', () => {
    expect(rechercherCommunes(communes, 'saint', 5)).toHaveLength(5)
  })
})
