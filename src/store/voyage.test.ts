import { beforeEach, describe, expect, it } from 'vitest'
import type { Lieu } from '../domain/types'
import { etatInitial, useVoyage } from './voyage'

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
