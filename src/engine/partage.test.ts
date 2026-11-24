import { describe, expect, it } from 'vitest'
import { decoderVoyage, encoderVoyage, type VoyagePartage } from './partage'
import { reglagesSimplesParDefaut } from './reglages'

const voyage: VoyagePartage = {
  depart: { nom: 'Saint-Étienne', detail: 'Loire, France', lat: 45.43391234, lon: 4.39, pays: 'fr' },
  arrivee: { nom: 'Kraków', detail: 'Pologne', lat: 50.06, lon: 19.94, pays: 'pl' },
  reglages: { simple: reglagesSimplesParDefaut('2027-01-01'), modifies: { etoiles: 4 } },
  graine: 7,
}

describe('partage par adresse', () => {
  it('fait l’aller-retour, accents compris, sans caractères à échapper', () => {
    const code = encoderVoyage(voyage)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    const v = decoderVoyage(code)!
    expect(v.depart.nom).toBe('Saint-Étienne')
    expect(v.arrivee.nom).toBe('Kraków')
    expect(v.depart.lat).toBe(45.43391)
    expect(v.reglages).toEqual(voyage.reglages)
    expect(v.graine).toBe(7)
  })

  it('refuse une adresse abîmée ou trafiquée', () => {
    expect(decoderVoyage('nimportequoi')).toBeNull()
    expect(decoderVoyage(encoderVoyage({ ...voyage, reglages: { ...voyage.reglages, simple: { ...voyage.reglages.simple, nuits: 999 } } }))).toBeNull()
    expect(decoderVoyage(encoderVoyage({ ...voyage, depart: { ...voyage.depart, lat: 200 } }))).toBeNull()
  })
})
