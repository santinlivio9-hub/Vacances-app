import { describe, expect, it } from 'vitest'
import { lien, lireRoute } from './routes'

describe('lireRoute', () => {
  it('reconnaît les pages et leurs paramètres', () => {
    const route = lireRoute('#/simulateur?d=nice&p=2')
    expect(route.page).toBe('simulateur')
    expect(route.params.get('d')).toBe('nice')
    expect(route.params.get('p')).toBe('2')
  })

  it('renvoie l’accueil pour un hash vide ou inconnu', () => {
    expect(lireRoute('').page).toBe('accueil')
    expect(lireRoute('#/').page).toBe('accueil')
    expect(lireRoute('#/nimporte-quoi').page).toBe('accueil')
  })

  it('garde les « ? » contenus dans les valeurs', () => {
    expect(lireRoute('#/recap?de=Paris%3F&x=a?b').params.get('x')).toBe('a?b')
  })
})

describe('lien', () => {
  it('construit des liens relisibles', () => {
    const params = new URLSearchParams({ d: 'rome', de: 'Saint-Étienne' })
    const route = lireRoute(lien('simulateur', params))
    expect(route.page).toBe('simulateur')
    expect(route.params.get('de')).toBe('Saint-Étienne')
  })

  it('donne #/ pour l’accueil', () => {
    expect(lien('accueil')).toBe('#/')
    expect(lien('simulations')).toBe('#/simulations')
  })
})
