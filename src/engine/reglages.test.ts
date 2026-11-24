import { describe, expect, it } from 'vitest'
import type { ReglagesSimples } from '../domain/types'
import { ajusterRepartition, estModifie, modeConseille, reglagesAvancesParDefaut, reglagesEffectifs, reglagesSimplesParDefaut } from './reglages'

const simple: ReglagesSimples = reglagesSimplesParDefaut('2027-01-10')

describe('réglages simples par défaut', () => {
  it('2 adultes, 7 nuits, style équilibré, départ dans un mois, sans limite de budget', () => {
    expect(simple).toMatchObject({ adultes: 2, enfants: 0, nuits: 7, style: 'equilibre', dateDepart: '2027-02-09', budget: null })
  })
})

describe('réglages avancés déduits du mode Simple', () => {
  it('suit le style choisi', () => {
    expect(reglagesAvancesParDefaut({ ...simple, style: 'eco' })).toMatchObject({ etoiles: 2, niveauResto: 'simple', quartier: 'calme' })
    expect(reglagesAvancesParDefaut({ ...simple, style: 'confort' })).toMatchObject({ etoiles: 4, petitDejeuner: true, classe: 'premium' })
  })

  it('prend un appartement pour un groupe en séjour long', () => {
    const r = reglagesAvancesParDefaut({ ...simple, adultes: 2, enfants: 2, nuits: 7 })
    expect(r.typeLogement).toBe('appartement')
    expect(r.chambres).toBe(1)
  })

  it('compte les chambres pour un nombre impair de voyageurs', () => {
    expect(reglagesAvancesParDefaut({ ...simple, adultes: 3, style: 'confort' }).chambres).toBe(2)
  })

  it('compte les véhicules : 4 adultes par voiture, 5 places avec des enfants', () => {
    expect(reglagesAvancesParDefaut({ ...simple, adultes: 5 }).vehicules).toBe(2)
    expect(reglagesAvancesParDefaut({ ...simple, adultes: 2, enfants: 3 }).vehicules).toBe(1)
  })

  it('choisit un rythme tranquille pour qui aime la détente', () => {
    expect(reglagesAvancesParDefaut({ ...simple, interets: ['detente'] })).toMatchObject({ rythme: 1, tempsLibre: true })
  })

  it('répartit le budget en parts dont la somme vaut 100 %', () => {
    const { repartition } = reglagesAvancesParDefaut(simple)
    expect(Object.values(repartition).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
  })
})

describe('réglages effectifs', () => {
  it('superpose les valeurs modifiées à la main aux valeurs par défaut', () => {
    const reglages = { simple, modifies: { etoiles: 4 as const } }
    expect(reglagesEffectifs(reglages).etoiles).toBe(4)
    expect(reglagesEffectifs(reglages).tauxImprevus).toBe(0.1)
    expect(estModifie(reglages, 'etoiles')).toBe(true)
    expect(estModifie(reglages, 'chambres')).toBe(false)
  })

  it('une valeur modifiée ne bouge plus quand on change le mode Simple', () => {
    const reglages = { simple: { ...simple, style: 'eco' as const }, modifies: { etoiles: 4 as const } }
    expect(reglagesEffectifs(reglages).etoiles).toBe(4)
    expect(reglagesEffectifs(reglages).niveauResto).toBe('simple')
  })
})

describe('mode de transport conseillé', () => {
  it('voiture pour un trajet court, train pour un moyen, avion pour un long ou outre-mer', () => {
    expect(modeConseille(150, true)).toBe('voiture')
    expect(modeConseille(430, true)).toBe('train')
    expect(modeConseille(1450, true)).toBe('avion')
    expect(modeConseille(5800, false)).toBe('avion')
    expect(modeConseille(200, false)).toBe('avion') // pas de route : île
  })
})

describe('ajusterRepartition', () => {
  it('garde une somme de 100 % en redistribuant proportionnellement', () => {
    const r = ajusterRepartition({ transport: 0.25, logement: 0.35, repas: 0.25, activites: 0.15 }, 'logement', 0.55)
    expect(r.logement).toBe(0.55)
    expect(Object.values(r).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
    expect(r.transport / r.activites).toBeCloseTo(0.25 / 0.15)
  })
  it('gère le cas où toutes les autres parts sont à zéro', () => {
    const r = ajusterRepartition({ transport: 1, logement: 0, repas: 0, activites: 0 }, 'transport', 0.4)
    expect(r.logement).toBeCloseTo(0.2)
  })
})
