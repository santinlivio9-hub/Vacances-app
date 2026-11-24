import { beforeEach, describe, expect, it } from 'vitest'
import type { Lieu } from '../domain/types'
import { etatInitial, normaliserSauvegarde, useVoyage, type VoyageSauvegarde } from './voyage'

const troyes: Lieu = { nom: 'Troyes', detail: 'France', lat: 48.3, lon: 4.07, pays: 'fr' }
const annecy: Lieu = { nom: 'Annecy', detail: 'France', lat: 45.9, lon: 6.13, pays: 'fr' }

beforeEach(() => useVoyage.setState(etatInitial()))

describe('store du voyage', () => {
  it('définit et inverse départ et arrivée', () => {
    const s = useVoyage.getState()
    s.definirDepart(troyes)
    s.definirArrivee(annecy)
    useVoyage.getState().inverser()
    expect(useVoyage.getState().depart?.nom).toBe('Annecy')
    expect(useVoyage.getState().arrivee?.nom).toBe('Troyes')
  })

  it('ne perd aucune donnée en passant de Simple à Avancé', () => {
    const s = useVoyage.getState()
    s.modifierSimple({ adultes: 3 })
    s.modifierAvance('etoiles', 4)
    s.basculerModeAvance()
    s.basculerModeAvance()
    const { reglages } = useVoyage.getState()
    expect(reglages.simple.adultes).toBe(3)
    expect(reglages.modifies.etoiles).toBe(4)
  })

  it('revient à la valeur par défaut d’un réglage avancé', () => {
    const s = useVoyage.getState()
    s.modifierAvance('etoiles', 4)
    s.modifierAvance('chambres', 2)
    useVoyage.getState().reinitialiserAvance('etoiles')
    expect(useVoyage.getState().reglages.modifies).toEqual({ chambres: 2 })
  })

  it('sauvegarde et rouvre un voyage', () => {
    const s = useVoyage.getState()
    expect(s.sauvegarder('incomplet')).toBeNull() // il faut un départ et une arrivée
    s.definirDepart(troyes)
    s.definirArrivee(annecy)
    const v = useVoyage.getState().sauvegarder('Week-end à Annecy')!
    useVoyage.getState().definirArrivee(null)
    useVoyage.getState().ouvrirSauvegarde(v.id)
    expect(useVoyage.getState().arrivee?.nom).toBe('Annecy')
    useVoyage.getState().supprimerSauvegarde(v.id)
    expect(useVoyage.getState().sauvegardes).toEqual([])
  })

  it('change la graine pour régénérer', () => {
    const avant = useVoyage.getState().graine
    useVoyage.getState().regenerer()
    expect(useVoyage.getState().graine).toBe(avant + 1)
  })
})

describe('mode de transport conseillé', () => {
  it('est appliqué une fois par trajet, sans écraser un choix fait ensuite', () => {
    const s = useVoyage.getState()
    s.definirDepart(troyes)
    s.definirArrivee(annecy)
    useVoyage.getState().appliquerModeConseille('train')
    expect(useVoyage.getState().reglages.simple.transport).toBe('train')
    useVoyage.getState().modifierSimple({ transport: 'voiture' })
    useVoyage.getState().appliquerModeConseille('train')
    expect(useVoyage.getState().reglages.simple.transport).toBe('voiture')
    useVoyage.getState().inverser()
    useVoyage.getState().appliquerModeConseille('car')
    expect(useVoyage.getState().reglages.simple.transport).toBe('car')
  })
})

describe('brouillons et sauvegardes', () => {
  it('garde un seul brouillon par trajet, remplacé par la sauvegarde', () => {
    const s = useVoyage.getState()
    s.definirDepart(troyes)
    s.definirArrivee(annecy)
    useVoyage.getState().enregistrerBrouillon()
    useVoyage.getState().modifierSimple({ adultes: 3 })
    useVoyage.getState().enregistrerBrouillon()
    let liste = useVoyage.getState().sauvegardes
    expect(liste).toHaveLength(1)
    expect(liste[0].statut).toBe('brouillon')
    expect(liste[0].reglages.simple.adultes).toBe(3)
    useVoyage.getState().sauvegarder('Annecy', { total: 1234 })
    liste = useVoyage.getState().sauvegardes
    expect(liste).toHaveLength(1)
    expect(liste[0].statut).toBe('calcule')
    expect(liste[0].total).toBe(1234)
  })

  it('remet d’aplomb une sauvegarde de la version précédente', () => {
    const ancienne = {
      id: 'a',
      nom: 'Ancien',
      creeLe: '2026-01-01T00:00:00Z',
      depart: troyes,
      arrivee: annecy,
      graine: 1,
      reglages: { simple: { dateDepart: '2027-05-10', nuits: 5, adultes: 2, enfants: 0, transport: 'train', style: 'eco', interets: [], budget: null }, modifies: { typeLogement: 'camping' } },
    } as unknown as VoyageSauvegarde
    const v = normaliserSauvegarde(ancienne, '2026-11-24')
    expect(v.statut).toBe('calcule')
    expect(v.majLe).toBe(ancienne.creeLe)
    expect(v.reglages.simple.typeVoyage).toBe('vacances')
    expect(v.reglages.simple.logements).toEqual(['camping'])
    expect(v.reglages.simple.flexible.dureeMin).toBeGreaterThan(0)
  })
})

describe('type de voyage', () => {
  it('un week-end dure 1 ou 2 nuits', () => {
    useVoyage.getState().choisirTypeVoyage('weekend')
    expect(useVoyage.getState().reglages.simple.nuits).toBe(2)
    useVoyage.getState().modifierSimple({ nuits: 6 })
    expect(useVoyage.getState().reglages.simple.nuits).toBe(2)
  })

  it('un stage calcule ses nuits à partir des dates et ne propose que des logements au mois', () => {
    useVoyage.getState().choisirTypeVoyage('stage')
    useVoyage.getState().modifierSimple({ dateDepart: '2027-03-01', stage: { ...useVoyage.getState().reglages.simple.stage, dateFin: '2027-05-10' } })
    const s = useVoyage.getState().reglages.simple
    expect(s.nuits).toBe(70)
    expect(s.adultes).toBe(1)
    expect(s.logements.every((l) => ['studio', 'colocation', 'habitant', 'residence', 'appartement'].includes(l))).toBe(true)
  })
})
