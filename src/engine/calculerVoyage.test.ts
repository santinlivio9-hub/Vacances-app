import { describe, expect, it } from 'vitest'
import { trouverDestination, villesDepart } from '../data'
import type { LieuDepart } from '../data/types'
import { calculerVoyage, chambresNecessaires, prixActivitesChoisies } from './calculerVoyage'
import type { ParametresVoyage } from './types'

const nice = trouverDestination('nice')!
const newYork = trouverDestination('new-york')!
const lisbonne = trouverDestination('lisbonne')!
const annecy = trouverDestination('annecy')!
const ville = (id: string) => villesDepart.find((v) => v.id === id)!
const paris = ville('paris')
const ajaccio: LieuDepart = { nom: 'Ajaccio', codePostal: '20000', lat: 41.93, lon: 8.74 }

/** 2 personnes, 7 nuits, confort moyen, train, Paris → Nice, en mai (moyenne saison à Nice). */
const base: ParametresVoyage = {
  destination: nice,
  depart: paris,
  personnes: 2,
  nuits: 7,
  confort: 'moyen',
  mode: 'train',
  dateDepart: '2027-05-12',
}

const somme = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)

describe('calculerVoyage — cas simple', () => {
  const r = calculerVoyage(base)

  it('calcule chaque poste', () => {
    expect(r.saison).toBe('moyenne')
    expect(r.chambres).toBe(1)
    expect(r.jours).toBe(7)
    expect(r.postes.logement).toBe(945) // 1 chambre × 7 nuits × 135 €
    expect(r.postes.repas).toBe(770) // 2 × 7 × 55 €
    expect(r.postes.activites).toBe(350) // 2 × 7 × 25 €
    expect(r.postes.transportLocal).toBe(70) // 2 × 7 × 5 €
    // train : ~823 km × 0,12 € ≈ 98,7 € l'aller, × 2 trajets × 2 personnes
    expect(r.postes.transport).toBeGreaterThan(390)
    expect(r.postes.transport).toBeLessThan(400)
  })

  it('ajoute 10 % d’imprévus et un total cohérent', () => {
    const horsImprevus = r.total - r.postes.imprevus
    expect(r.postes.imprevus).toBe(Math.round(horsImprevus * 0.1))
    expect(r.total).toBe(somme(r.postes))
    expect(r.parPersonne).toBe(Math.round(r.total / 2))
    expect(r.transport?.mode).toBe('train')
    expect(r.avertissements).toEqual([])
  })
})

describe('calculerVoyage — voyageurs et durée', () => {
  it('une seule personne paie la chambre entière', () => {
    const solo = calculerVoyage({ ...base, personnes: 1 })
    expect(solo.chambres).toBe(1)
    expect(solo.postes.logement).toBe(945)
    expect(solo.postes.repas).toBe(385)
    expect(solo.parPersonne).toBe(solo.total)
  })

  it('un nombre impair de voyageurs arrondit les chambres au-dessus', () => {
    expect(chambresNecessaires(3)).toBe(2)
    expect(chambresNecessaires(5)).toBe(3)
    const trois = calculerVoyage({ ...base, personnes: 3 })
    expect(trois.chambres).toBe(2)
    expect(trois.postes.logement).toBe(2 * 7 * 135)
  })

  it('compte une voiture pour 4 places', () => {
    const quatre = calculerVoyage({ ...base, mode: 'voiture', personnes: 4 })
    const cinq = calculerVoyage({ ...base, mode: 'voiture', personnes: 5 })
    expect(quatre.transport?.vehicules).toBe(1)
    expect(cinq.transport?.vehicules).toBe(2)
    expect(cinq.postes.transport).toBeCloseTo(2 * quatre.postes.transport, -1)
    // en voiture, le coût ne dépend pas du nombre de passagers dans le véhicule
    expect(calculerVoyage({ ...base, mode: 'voiture', personnes: 1 }).postes.transport).toBe(quatre.postes.transport)
  })

  it('gère un séjour d’une seule nuit', () => {
    const r = calculerVoyage({ ...base, nuits: 1 })
    expect(r.jours).toBe(1)
    expect(r.postes.logement).toBe(135)
    expect(r.postes.repas).toBe(110)
    // le transport ne dépend pas de la durée
    expect(r.postes.transport).toBe(calculerVoyage(base).postes.transport)
  })

  it('accepte un nombre de chambres choisi', () => {
    expect(calculerVoyage({ ...base, chambres: 2 }).postes.logement).toBe(2 * 945)
  })
})

describe('calculerVoyage — saison', () => {
  it('déduit la haute saison du mois de départ', () => {
    const aout = calculerVoyage({ ...base, dateDepart: '2027-08-03' })
    expect(aout.saison).toBe('haute')
    expect(aout.postes.logement).toBe(Math.round(945 * 1.35))
  })

  it('déduit la basse saison', () => {
    expect(calculerVoyage({ ...base, dateDepart: '2027-11-20' }).saison).toBe('basse')
  })

  it('prend la moyenne saison sans date', () => {
    expect(calculerVoyage({ ...base, dateDepart: undefined }).saison).toBe('moyenne')
  })

  it('respecte une saison forcée', () => {
    expect(calculerVoyage({ ...base, dateDepart: '2027-08-03', saison: 'basse' }).saison).toBe('basse')
  })

  it('majore l’avion en haute saison', () => {
    const avion = { ...base, mode: 'avion' as const }
    const moyenne = calculerVoyage({ ...avion, saison: 'moyenne' }).postes.transport
    const haute = calculerVoyage({ ...avion, saison: 'haute' }).postes.transport
    expect(haute).toBeCloseTo(moyenne * 1.25, -1)
  })
})

describe('calculerVoyage — transport impossible', () => {
  it('bascule sur l’avion quand la voiture est impossible (New York)', () => {
    const r = calculerVoyage({ ...base, destination: newYork, mode: 'voiture' })
    expect(r.transport?.mode).toBe('avion')
    expect(r.postes.transport).toBeGreaterThan(1000)
    expect(r.avertissements[0]).toMatch(/voiture.*New York.*avion/)
  })

  it('choisit le mode possible le moins cher quand le train est impossible (Lisbonne)', () => {
    const r = calculerVoyage({ ...base, destination: lisbonne, mode: 'train' })
    expect(r.transport?.mode).toBe('avion')
    expect(r.avertissements).toHaveLength(1)
  })

  it('refuse l’avion sur une courte distance (Lyon → Annecy)', () => {
    const r = calculerVoyage({ ...base, destination: annecy, depart: ville('lyon'), mode: 'avion' })
    expect(r.transport?.mode).not.toBe('avion')
    expect(r.avertissements[0]).toMatch(/Trop proche/)
  })

  it('ne propose que l’avion depuis la Corse, même pour Nice (moins de 300 km)', () => {
    const r = calculerVoyage({ ...base, depart: ajaccio, mode: 'voiture' })
    expect(r.transport?.mode).toBe('avion')
    expect(r.transport?.aeroportDepart?.code).toBe('AJA')
    expect(r.postes.transport).toBeGreaterThan(0)
  })
})

describe('calculerVoyage — avion et accès à l’aéroport', () => {
  it('ajoute le trajet jusqu’à l’aéroport depuis Troyes', () => {
    const depuisParis = calculerVoyage({ ...base, mode: 'avion' })
    const depuisTroyes = calculerVoyage({ ...base, mode: 'avion', depart: ville('troyes') })
    expect(depuisTroyes.transport?.aeroportDepart?.code).toBe('PAR')
    expect(depuisTroyes.transport?.accesAeroportKm).toBeGreaterThan(100)
    expect(depuisParis.transport?.accesAeroportKm).toBe(0)
    expect(depuisTroyes.postes.transport).toBeGreaterThan(depuisParis.postes.transport)
  })
})

describe('calculerVoyage — options', () => {
  it('rend les imprévus réglables', () => {
    expect(calculerVoyage({ ...base, tauxImprevus: 0 }).postes.imprevus).toBe(0)
    const r = calculerVoyage({ ...base, tauxImprevus: 0.2 })
    expect(r.postes.imprevus).toBe(Math.round((r.total - r.postes.imprevus) * 0.2))
  })

  it('ajoute les activités cochées pour chaque voyageur', () => {
    // Musées de Nice (15 €) + Èze et Monaco (60 €)
    expect(prixActivitesChoisies(nice, [0, 1])).toBe(75)
    expect(prixActivitesChoisies(nice, [0, 0, 99])).toBe(15) // doublons et indices inconnus ignorés
    const r = calculerVoyage({ ...base, activitesChoisies: [0, 1] })
    expect(r.postes.activites).toBe(350 + 2 * 75)
  })
})

describe('calculerVoyage — paramètres invalides', () => {
  it.each([
    [{ personnes: 0 }, /voyageurs/],
    [{ personnes: 2.5 }, /voyageurs/],
    [{ nuits: 0 }, /nuits/],
    [{ chambres: 0 }, /chambres/],
    [{ tauxImprevus: -0.1 }, /imprévus/],
    [{ tauxImprevus: 1.5 }, /imprévus/],
    [{ dateDepart: '2027-02-30' }, /Date invalide/],
    [{ dateDepart: '12/05/2027' }, /Date invalide/],
  ])('refuse %o', (modif, message) => {
    expect(() => calculerVoyage({ ...base, ...modif })).toThrow(message)
  })
})
