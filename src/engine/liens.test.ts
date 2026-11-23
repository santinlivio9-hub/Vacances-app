import { describe, expect, it } from 'vitest'
import { trouverDestination, villesDepart } from '../data'
import { genererLiensReservation, type ParametresLiens } from './liens'

const nice = trouverDestination('nice')!
const troyes = villesDepart.find((v) => v.id === 'troyes')!
const base: ParametresLiens = { depart: troyes, personnes: 3, nuits: 7, mode: 'avion', dateDepart: '2027-06-01' }

const lien = (site: string, params = base, destination = nice) => {
  const trouve = genererLiensReservation(destination, params).find((l) => l.site === site)
  if (!trouve) throw new Error(`Pas de lien ${site}`)
  return { ...trouve, u: new URL(trouve.url) }
}

describe('genererLiensReservation — logement', () => {
  it('pré-remplit Booking.com (ville, dates, voyageurs, chambres)', () => {
    const { u, prerempli } = lien('Booking.com')
    expect(u.hostname).toBe('www.booking.com')
    expect(u.searchParams.get('ss')).toBe('Nice, France')
    expect(u.searchParams.get('checkin')).toBe('2027-06-01')
    expect(u.searchParams.get('checkout')).toBe('2027-06-08')
    expect(u.searchParams.get('group_adults')).toBe('3')
    expect(u.searchParams.get('no_rooms')).toBe('2')
    expect(prerempli).toBe(true)
  })

  it('pré-remplit Airbnb', () => {
    const { u } = lien('Airbnb')
    expect(u.pathname).toBe('/s/Nice--France/homes')
    expect(u.searchParams.get('checkin')).toBe('2027-06-01')
    expect(u.searchParams.get('checkout')).toBe('2027-06-08')
    expect(u.searchParams.get('adults')).toBe('3')
  })

  it('encode les noms avec espaces et accents', () => {
    const { u } = lien('Airbnb', base, trouverDestination('new-york')!)
    expect(decodeURIComponent(u.pathname)).toBe('/s/New-York--États-Unis/homes')
  })

  it('passe à la ligne de mois correctement', () => {
    const { u } = lien('Booking.com', { ...base, dateDepart: '2027-12-28' })
    expect(u.searchParams.get('checkout')).toBe('2028-01-04')
  })
})

describe('genererLiensReservation — transport', () => {
  it('avion : Skyscanner depuis l’aéroport le plus proche, dates au format AAMMJJ', () => {
    const { u, prerempli } = lien('Skyscanner')
    expect(u.pathname).toBe('/transport/vols/cdg/nce/270601/270608/')
    expect(u.searchParams.get('adultsv2')).toBe('3')
    expect(prerempli).toBe(true)
  })

  it('avion : remplace les codes de ville (New York, Rome) par l’aéroport principal', () => {
    expect(lien('Skyscanner', base, trouverDestination('new-york')!).u.pathname).toContain('/cdg/jfk/')
    expect(lien('Skyscanner', base, trouverDestination('rome')!).u.pathname).toContain('/cdg/fco/')
  })

  it('avion : Google Flights en simple lien de recherche', () => {
    expect(lien('Google Flights').prerempli).toBe(false)
  })

  it('train : SNCF Connect et Trainline en simples liens', () => {
    const liens = genererLiensReservation(nice, { ...base, mode: 'train' }).filter((l) => l.poste === 'transport')
    expect(liens.map((l) => l.site)).toEqual(['SNCF Connect', 'Trainline'])
    expect(liens.every((l) => !l.prerempli)).toBe(true)
  })

  it('voiture : itinéraire Google Maps', () => {
    const { u } = lien('Google Maps (itinéraire)', { ...base, mode: 'voiture' })
    expect(u.searchParams.get('api')).toBe('1')
    expect(u.searchParams.get('origin')).toBe('Troyes 10000')
    expect(u.searchParams.get('destination')).toBe('Nice, France')
    expect(u.searchParams.get('travelmode')).toBe('driving')
  })
})

describe('genererLiensReservation — général', () => {
  it('propose GetYourGuide pour les activités', () => {
    const { u, poste } = lien('GetYourGuide')
    expect(poste).toBe('activites')
    expect(u.searchParams.get('q')).toBe('Nice')
  })

  it('sans date, ouvre de simples recherches', () => {
    const sansDate = { ...base, dateDepart: undefined }
    expect(lien('Booking.com', sansDate).u.searchParams.has('checkin')).toBe(false)
    expect(lien('Booking.com', sansDate).prerempli).toBe(false)
    expect(lien('Skyscanner', sansDate).u.pathname).toBe('/transport/vols/cdg/nce/')
  })

  it('ne produit que des URL https valides', () => {
    for (const mode of ['voiture', 'train', 'avion'] as const) {
      for (const l of genererLiensReservation(nice, { ...base, mode })) {
        expect(new URL(l.url).protocol).toBe('https:')
      }
    }
  })

  it('refuse une date invalide', () => {
    expect(() => genererLiensReservation(nice, { ...base, dateDepart: '2027-13-01' })).toThrow(/Date invalide/)
  })
})
