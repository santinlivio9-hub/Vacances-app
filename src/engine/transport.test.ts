import { describe, expect, it } from 'vitest'
import { tarifsTransport, trouverDestination, villesDepart } from '../data'
import { CONTEXTE_PAR_DEFAUT } from './contexte'
import { choisirTransport, coutVoitureParKm, optionsTransport, prixTrainParPersonne, prixVolParPersonne } from './transport'

const paris = villesDepart[0]

describe('barèmes', () => {
  it('voiture : carburant + péages ≈ 0,21 €/km', () => {
    expect(coutVoitureParKm(tarifsTransport)).toBeCloseTo(0.065 * 2.05 + 0.075, 6)
  })

  it('train : applique le minimum et le plafond', () => {
    expect(prixTrainParPersonne(50, tarifsTransport)).toBe(15)
    expect(prixTrainParPersonne(500, tarifsTransport)).toBeCloseTo(60, 6)
    expect(prixTrainParPersonne(3000, tarifsTransport)).toBe(150)
  })

  it('avion : forfait + tranches dégressives', () => {
    expect(prixVolParPersonne(500, 'moyenne', tarifsTransport)).toBeCloseTo(45 + 500 * 0.07, 6)
    expect(prixVolParPersonne(2000, 'moyenne', tarifsTransport)).toBeCloseTo(45 + 70 + 1000 * 0.035, 6)
    expect(prixVolParPersonne(5000, 'moyenne', tarifsTransport)).toBeCloseTo(45 + 70 + 70 + 2000 * 0.04, 6)
  })

  it('avion : coefficient de saison', () => {
    const moyenne = prixVolParPersonne(1500, 'moyenne', tarifsTransport)
    expect(prixVolParPersonne(1500, 'haute', tarifsTransport)).toBeCloseTo(moyenne * 1.25, 6)
    expect(prixVolParPersonne(1500, 'basse', tarifsTransport)).toBeCloseTo(moyenne * 0.9, 6)
  })
})

describe('optionsTransport', () => {
  it('propose les trois modes pour Nice', () => {
    const options = optionsTransport(paris, trouverDestination('nice')!, 2, 'moyenne', CONTEXTE_PAR_DEFAUT)
    expect(options.map((o) => o.mode)).toEqual(['voiture', 'train', 'avion'])
    expect(options.every((o) => o.disponible && o.cout > 0)).toBe(true)
  })

  it('n’autorise que l’avion pour Bangkok, avec une raison pour les autres', () => {
    const options = optionsTransport(paris, trouverDestination('bangkok')!, 2, 'moyenne', CONTEXTE_PAR_DEFAUT)
    const [voiture, train, avion] = options
    expect(voiture.disponible).toBe(false)
    expect(voiture.raison).toMatch(/Bangkok/)
    expect(voiture.cout).toBe(0)
    expect(train.disponible).toBe(false)
    expect(avion.disponible).toBe(true)
  })

  it('donne des ordres de grandeur réalistes au départ de Paris (A/R par personne)', () => {
    const prixAvion = (id: string) =>
      optionsTransport(paris, trouverDestination(id)!, 1, 'moyenne', CONTEXTE_PAR_DEFAUT).find((o) => o.mode === 'avion')!.cout
    expect(prixAvion('nice')).toBeGreaterThan(120)
    expect(prixAvion('nice')).toBeLessThan(260)
    expect(prixAvion('new-york')).toBeGreaterThan(450)
    expect(prixAvion('new-york')).toBeLessThan(800)
    expect(prixAvion('bangkok')).toBeGreaterThan(700)
    expect(prixAvion('bangkok')).toBeLessThan(1100)
  })
})

describe('choisirTransport', () => {
  const options = optionsTransport(paris, trouverDestination('nice')!, 2, 'moyenne', CONTEXTE_PAR_DEFAUT)

  it('garde le mode souhaité quand il est possible', () => {
    expect(choisirTransport(options, 'voiture')?.mode).toBe('voiture')
  })

  it('prend le moins cher sinon', () => {
    const sansTrain = options.map((o) => (o.mode === 'train' ? { ...o, disponible: false } : o))
    const moinsCher = [...sansTrain].filter((o) => o.disponible).sort((a, b) => a.cout - b.cout)[0]
    expect(choisirTransport(sansTrain, 'train')?.mode).toBe(moinsCher.mode)
  })

  it('renvoie null si rien n’est possible', () => {
    expect(choisirTransport(options.map((o) => ({ ...o, disponible: false })), 'avion')).toBeNull()
  })
})
