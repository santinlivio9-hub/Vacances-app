import { describe, expect, it } from 'vitest'
import {
  aujourdhui,
  decoderBudget,
  decoderSimulation,
  encoderBudget,
  encoderSimulation,
  rechercheBudgetParDefaut,
  simulationParDefaut,
  type Simulation,
} from './simulation'

const defaut = simulationParDefaut('2027-01-10')

const complete: Simulation = {
  destinationId: 'nice',
  depart: { nom: 'Rosières-près-Troyes', codePostal: '10430', lat: 48.26, lon: 4.07 },
  personnes: 3,
  nuits: 5,
  confort: 'confort',
  mode: 'avion',
  dateDepart: '2027-07-14',
  saison: 'haute',
  tauxImprevus: 0.15,
  activites: [0, 2],
  chambres: 3,
}

describe('valeurs par défaut', () => {
  it('2 personnes, 7 nuits, confort moyen, départ de Paris dans un mois', () => {
    expect(defaut).toMatchObject({ personnes: 2, nuits: 7, confort: 'moyen', destinationId: null, dateDepart: '2027-02-09' })
    expect(defaut.depart.nom).toBe('Paris')
  })

  it('formate la date du jour', () => {
    expect(aujourdhui(new Date(2027, 0, 5))).toBe('2027-01-05')
  })
})

describe('encoderSimulation / decoderSimulation', () => {
  it('fait l’aller-retour sans perte', () => {
    expect(decoderSimulation(encoderSimulation(complete), defaut)).toEqual(complete)
  })

  it('n’écrit pas les options laissées par défaut', () => {
    const params = encoderSimulation({ ...defaut, destinationId: 'rome' })
    expect(params.has('s')).toBe(false)
    expect(params.has('imp')).toBe(false)
    expect(params.has('act')).toBe(false)
    expect(params.has('ch')).toBe(false)
  })

  it('reprend les valeurs par défaut pour une URL vide', () => {
    expect(decoderSimulation(new URLSearchParams(), defaut)).toEqual(defaut)
  })

  it('corrige les valeurs hors limites ou invalides', () => {
    const sim = decoderSimulation(
      new URLSearchParams('d=atlantide&p=99&n=0&c=luxe&m=fusee&date=2027-02-31&s=été&imp=80&act=x,1&ch=50&de=Paris&cp=75001&lat=10&lon=2'),
      defaut,
    )
    expect(sim.destinationId).toBeNull()
    expect(sim.personnes).toBe(20)
    expect(sim.nuits).toBe(1)
    expect(sim.confort).toBe('moyen')
    expect(sim.mode).toBe('train')
    expect(sim.dateDepart).toBe(defaut.dateDepart)
    expect(sim.saison).toBeNull()
    expect(sim.tauxImprevus).toBe(0.3)
    expect(sim.activites).toEqual([]) // pas de destination : aucune activité valide
    expect(sim.chambres).toBe(20) // plafonné au nombre de voyageurs
    expect(sim.depart).toEqual(defaut.depart) // coordonnées hors de France
  })

  it('ne garde que les activités qui existent pour la destination', () => {
    const sim = decoderSimulation(new URLSearchParams('d=nice&act=4,1,1,12'), defaut)
    expect(sim.activites).toEqual([1, 4])
  })
})

describe('encoderBudget / decoderBudget', () => {
  const defautBudget = rechercheBudgetParDefaut('2027-01-10')

  it('fait l’aller-retour sans perte', () => {
    const recherche = { ...defautBudget, budget: 4200, personnes: 4, mode: 'voiture' as const }
    expect(decoderBudget(encoderBudget(recherche), defautBudget)).toEqual(recherche)
  })

  it('borne le budget', () => {
    expect(decoderBudget(new URLSearchParams('b=5'), defautBudget).budget).toBe(100)
    expect(decoderBudget(new URLSearchParams('b=abc'), defautBudget).budget).toBe(2500)
  })
})
