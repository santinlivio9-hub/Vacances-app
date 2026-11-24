import { describe, expect, it } from 'vitest'
import type { Favori } from '../store/favoris'
import type { VoyageSauvegarde } from '../store/voyage'
import { differences, empreinte, fusionnerFavoris, fusionnerVoyages, versionVoyage } from './fusion'

const v = (id: string, majLe: string, nom = id) => ({ id, nom, majLe, creeLe: '2026-01-01T00:00:00Z' }) as VoyageSauvegarde
const f = (id: string, ajouteLe: string) => ({ id, ajouteLe, type: 'destination', nom: id, detail: '' }) as Favori

describe('fusion appareil ↔ compte', () => {
  it('réunit les voyages et garde la version la plus récente', () => {
    const r = fusionnerVoyages([v('a', '2026-03-01', 'local'), v('b', '2026-01-05')], [v('a', '2026-02-01', 'compte'), v('c', '2026-04-01')])
    expect(r.map((x) => x.id)).toEqual(['c', 'a', 'b'])
    expect(r.find((x) => x.id === 'a')!.nom).toBe('local')
    const r2 = fusionnerVoyages([v('a', '2026-01-01', 'local')], [v('a', '2026-02-01', 'compte')])
    expect(r2[0].nom).toBe('compte')
  })

  it('réunit les favoris sans doublon', () => {
    expect(fusionnerFavoris([f('x', '2026-02-01'), f('y', '2026-01-01')], [f('x', '2026-01-15'), f('z', '2026-03-01')]).map((x) => x.id)).toEqual(['z', 'x', 'y'])
  })

  it('n’envoie que ce qui a changé et repère les suppressions', () => {
    const avant = empreinte([v('a', '1'), v('b', '1')], versionVoyage)
    const { aEnvoyer, aSupprimer } = differences(avant, [v('a', '2'), v('c', '1')], versionVoyage)
    expect(aEnvoyer.map((x) => x.id)).toEqual(['a', 'c'])
    expect(aSupprimer).toEqual(['b'])
  })
})
