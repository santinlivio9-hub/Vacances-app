import { describe, expect, it } from 'vitest'
import type { Lieu, ReglagesSimples } from '../domain/types'
import { checklistVoyage, genererLiensReservation, liensActivite } from './liens'
import { reglagesSimplesParDefaut } from './reglages'

const troyes: Lieu = { nom: 'Troyes', detail: 'Aube, France', lat: 48.2973, lon: 4.0744, pays: 'fr', type: 'city' }
const annecy: Lieu = { nom: 'Annecy', detail: 'Haute-Savoie, France', lat: 45.8992, lon: 6.1294, pays: 'fr', type: 'city' }
const newYork: Lieu = { nom: 'New York', detail: 'États-Unis', lat: 40.71, lon: -74, pays: 'us', type: 'city' }
const simple: ReglagesSimples = { ...reglagesSimplesParDefaut('2027-04-01'), dateDepart: '2027-05-10', nuits: 7, adultes: 2, enfants: 1 }
const liens = (s: Partial<ReglagesSimples>, arrivee = annecy) => genererLiensReservation({ depart: troyes, arrivee, reglages: { simple: { ...simple, ...s }, modifies: {} } })

describe('genererLiensReservation', () => {
  it('pré-remplit Booking avec les dates, les voyageurs et l’âge des enfants', () => {
    const booking = liens({}).find((l) => l.url.includes('booking.com'))!
    const url = new URL(booking.url)
    expect(url.searchParams.get('ss')).toBe('Annecy')
    expect(url.searchParams.get('checkin')).toBe('2027-05-10')
    expect(url.searchParams.get('checkout')).toBe('2027-05-17')
    expect(url.searchParams.get('group_adults')).toBe('2')
    expect(url.searchParams.getAll('age')).toHaveLength(1)
  })

  it('propose des liens adaptés au mode de transport', () => {
    expect(liens({ transport: 'voiture' }).some((l) => l.url.includes('blablacar.fr/search?fn=Troyes&tn=Annecy&db=2027-05-10'))).toBe(true)
    expect(liens({ transport: 'avion' }, newYork).some((l) => l.url.includes('google.com/travel/flights'))).toBe(true)
    expect(liens({ transport: 'train' }).some((l) => l.url.includes('travelmode=transit'))).toBe(true)
  })

  it('encode les noms de lieux et donne des adresses valides', () => {
    const l = genererLiensReservation({ depart: troyes, arrivee: { ...annecy, nom: 'Saint-Étienne & co' }, reglages: { simple, modifies: {} } })
    for (const lien of l) expect(() => new URL(lien.url)).not.toThrow()
    expect(l.find((x) => x.url.includes('booking'))!.url).toContain('Saint-%C3%89tienne%20%26%20co')
  })

  it('ajoute les conseils aux voyageurs hors Schengen', () => {
    expect(liens({}, newYork).some((l) => l.categorie === 'pratique')).toBe(true)
    expect(liens({}).some((l) => l.categorie === 'pratique')).toBe(false)
  })
})

describe('checklist', () => {
  it('rappelle l’ESTA pour les États-Unis et le passeport hors Schengen', () => {
    const c = checklistVoyage({ arrivee: newYork, reglages: { simple: { ...simple, transport: 'avion' }, modifies: {} } }).map((e) => e.libelle).join(' | ')
    expect(c).toMatch(/ESTA/)
    expect(c).toMatch(/passeport/)
    expect(c).toMatch(/enregistrer/)
  })
})

describe('liensActivite', () => {
  it('pointe vers Wikipédia, OpenStreetMap ou une recherche', () => {
    expect(liensActivite({ id: 'x', nom: 'Château', type: 'monument', lat: 0, lon: 0, wikipedia: 'fr:Château d’Annecy', source: 'osm' }, 'Annecy').infos).toContain('fr.wikipedia.org/wiki/Ch')
    expect(liensActivite({ id: 'osm-way-12', nom: 'Parc', type: 'parc', lat: 0, lon: 0, source: 'osm' }, 'Annecy')).toEqual({ infos: 'https://www.openstreetmap.org/way/12', reserver: null })
    expect(liensActivite({ id: 'gen-musee', nom: 'Musée principal', type: 'musee', lat: 0, lon: 0, source: 'generique' }, 'Annecy').reserver).toContain('getyourguide')
  })
})

describe('badge « dates et voyageurs pré-remplis »', () => {
  it('n’apparaît que si l’adresse contient les dates et les voyageurs', () => {
    const tous = liens({ typeVoyage: 'stage', transport: 'voiture', logements: ['colocation', 'studio'] })
    const parTitre = (t: RegExp) => tous.find((l) => t.test(l.titre))!
    expect(parTitre(/Leboncoin/).preRempli).toBe(false)
    expect(parTitre(/Google Maps/).preRempli).toBe(false)
    expect(parTitre(/GetYourGuide/).preRempli).toBe(false)
    expect(parTitre(/BlaBlaCar/).preRempli).toBe(true)
    expect(parTitre(/Booking/).preRempli).toBe(true)
    expect(parTitre(/Airbnb/).preRempli).toBe(true)
  })
})
