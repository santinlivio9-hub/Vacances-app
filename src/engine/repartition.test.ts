import { describe, expect, it } from 'vitest'
import type { ProfilPaiement, TypeVoyageur, Voyageur } from '../domain/types'
import { calculerRepartition, equilibrer, fractionLisible, poidsCout, resumeTexte, voyageursParDefaut, type VoyagePourRepartition } from './repartition'

const v = (id: string, type: TypeVoyageur, paiement: ProfilPaiement, extra: Partial<Voyageur> = {}): Voyageur => ({ id, type, paiement, prenom: id, ...extra })
const part = (r: ReturnType<typeof calculerRepartition>, id: string) => r.parts.find((p) => p.id === id)!.montant
const somme = (r: ReturnType<typeof calculerRepartition>) => Math.round(r.parts.reduce((t, p) => t + p.montant * 100, 0))

describe('répartition des dépenses', () => {
  it('3 adultes + 1 enfant, par défaut : l’enfant ne paie rien, les adultes un tiers chacun', () => {
    const voyageurs = voyageursParDefaut(3, 1)
    const r = calculerRepartition({ postes: { transport: 400, logement: 300, repas: 200, activites: 100 } }, voyageurs)
    expect(r.ok).toBe(true)
    const [a, b, c, enfant] = r.parts
    expect(enfant.montant).toBe(0)
    expect(enfant.explication).toMatch(/Gratuit/)
    expect([a.montant, b.montant, c.montant]).toEqual([333.34, 333.33, 333.33])
    expect(somme(r)).toBe(100000)
    // L'enfant a un coût (billet, repas à 70 %), même s'il ne paie rien
    expect(enfant.coutPropre).toBeGreaterThan(0)
  })

  it('exemple du besoin : enfant 0, A invité ne paie rien, B paie le musée et sa part du logement et des repas, C le reste', () => {
    const voyage: VoyagePourRepartition = {
      postes: { transport: 300, logement: 600, repas: 400, activites: 100 },
      activites: [
        { id: 'musee', nom: 'Musée', prix: 60 },
        { id: 'parc', nom: 'Parc d’attractions', prix: 40 },
      ],
    }
    const voyageurs = [v('A', 'adulte', 'rien'), v('B', 'adulte', 'postes', { postes: ['logement', 'repas'] }), v('C', 'adulte', 'part'), v('E', 'enfant', 'rien', { age: 8 })]
    const r = calculerRepartition(voyage, voyageurs, { activites: { musee: { payeurs: ['B'] }, parc: { participants: ['A', 'C', 'E'] } } })
    expect(r.ok).toBe(true)
    expect(part(r, 'A')).toBe(0)
    expect(part(r, 'E')).toBe(0)
    // Logement 600 / 4 = 150 ; repas 400 × 1/3,7 = 108,11 ; musée 60 × 1/3,7 = 16,22
    expect(part(r, 'B')).toBeCloseTo(274.32, 2)
    expect(part(r, 'C')).toBeCloseTo(1125.68, 2)
    expect(somme(r)).toBe(140000)
    const b = r.parts.find((p) => p.id === 'B')!
    expect(b.explication).toBe('Logement 1/4 + repas 27 % + Musée 27 %')
    expect(b.lignes.map((l) => l.id).sort()).toEqual(['logement', 'musee', 'repas'])
    expect(r.parts.find((p) => p.id === 'A')!.explication).toMatch(/Invité/)
  })

  it('montant fixe, pourcentage et parts égales mélangés', () => {
    const voyageurs = [v('F', 'adulte', 'fixe', { montant: 150 }), v('P', 'adulte', 'pourcentage', { pourcentage: 20 }), v('X', 'adulte', 'part'), v('Y', 'adulte', 'part')]
    const r = calculerRepartition({ postes: { transport: 1000 } }, voyageurs)
    expect(r.ok).toBe(true)
    expect(r.parts.map((p) => p.montant)).toEqual([150, 200, 325, 325])
    expect(r.parts[1].explication).toBe('20 % du total')
  })

  it('poids de redistribution (mode Avancé) et logement par chambre', () => {
    const voyageurs = [v('X', 'adulte', 'part', { poids: 2 }), v('Y', 'adulte', 'part'), v('A', 'adulte', 'rien')]
    const r = calculerRepartition({ postes: { transport: 300 } }, voyageurs)
    // A (100) est repris 2/3 par X, 1/3 par Y
    expect(r.parts.map((p) => p.montant)).toEqual([166.67, 133.33, 0])
    const chambres = calculerRepartition({ postes: { logement: 400 } }, [v('X', 'adulte', 'part'), v('Y', 'adulte', 'part'), v('Z', 'adulte', 'part')], { logementParChambre: true, chambres: [['X', 'Y'], ['Z']] })
    expect(chambres.parts.map((p) => p.montant)).toEqual([100, 100, 200])
  })

  it('un bébé ne coûte rien en logement ni en train, 30 % des repas', () => {
    const bebe = v('b', 'bebe', 'rien', { age: 1 })
    expect(poidsCout(bebe, 'logement')).toBe(0)
    expect(poidsCout(bebe, 'transport')).toBe(0)
    expect(poidsCout(bebe, 'transport', true)).toBe(0.1)
    expect(poidsCout(bebe, 'repas')).toBe(0.3)
    const r = calculerRepartition({ postes: { logement: 200, repas: 230 } }, [v('X', 'adulte', 'part'), v('Y', 'adulte', 'postes', { postes: ['logement', 'repas'] }), bebe])
    // Y : logement 100 + repas 230 / 2,3 = 100 → 200 ; X : le reste, dont la part du bébé (30 €)
    expect(r.parts.map((p) => p.montant)).toEqual([230, 200, 0])
    expect(r.parts[2].coutPropre).toBe(30)
  })

  it('la somme des parts vaut toujours le total, au centime près (1 000 tirages)', () => {
    let graine = 42
    const hasard = () => ((graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648)
    const types: TypeVoyageur[] = ['adulte', 'adulte', 'enfant', 'bebe']
    const profils: ProfilPaiement[] = ['part', 'rien', 'postes', 'fixe', 'pourcentage']
    const postes = ['transport', 'logement', 'repas', 'activites', 'transportLocal', 'divers', 'imprevus'] as const
    let reussis = 0
    for (let n = 0; n < 1000; n++) {
      const nb = 1 + Math.floor(hasard() * 7)
      const voyageurs: Voyageur[] = Array.from({ length: nb }, (_, i) => {
        const paiement = i === 0 ? 'part' : profils[Math.floor(hasard() * profils.length)]
        return v(`v${i}`, i === 0 ? 'adulte' : types[Math.floor(hasard() * types.length)], paiement, {
          postes: postes.filter(() => hasard() < 0.4),
          montant: Math.round(hasard() * 8000) / 100,
          pourcentage: Math.round(hasard() * 15),
          poids: hasard() < 0.2 ? 1 + Math.floor(hasard() * 3) : undefined,
        })
      })
      const voyage: VoyagePourRepartition = {
        postes: Object.fromEntries(postes.map((p) => [p, Math.round(hasard() * 100000) / 100])),
        activites: hasard() < 0.5 ? [{ id: 'a1', nom: 'Visite', prix: Math.round(hasard() * 9000) / 100 }] : undefined,
        avion: hasard() < 0.3,
      }
      const r = calculerRepartition(voyage, voyageurs, { activites: { a1: { participants: voyageurs.filter(() => hasard() < 0.6).map((x) => x.id), payeurs: hasard() < 0.5 ? [voyageurs[voyageurs.length - 1].id] : undefined } } })
      if (!r.ok) continue
      reussis++
      expect(somme(r)).toBe(Math.round(r.total * 100))
      for (const p of r.parts) {
        expect(p.montant).toBeGreaterThanOrEqual(0)
        expect(Math.round(p.lignes.reduce((t, l) => t + l.montant * 100, 0))).toBe(Math.round(p.montant * 100))
      }
    }
    expect(reussis).toBeGreaterThan(900)
  })

  it('cas impossibles : message clair au lieu d’un calcul faux', () => {
    const voyage = { postes: { transport: 1000 } }
    const personne = calculerRepartition(voyage, [v('A', 'adulte', 'rien'), v('E', 'enfant', 'rien')])
    expect(personne.ok).toBe(false)
    expect(!personne.ok && personne.erreur).toMatch(/Personne ne paie/)

    const tropFixe = calculerRepartition(voyage, [v('A', 'adulte', 'fixe', { montant: 1500 }), v('B', 'adulte', 'part')])
    expect(!tropFixe.ok && tropFixe.erreur).toMatch(/dépassent le total/)

    const tropPct = calculerRepartition(voyage, [v('A', 'adulte', 'pourcentage', { pourcentage: 60 }), v('B', 'adulte', 'pourcentage', { pourcentage: 50 }), v('C', 'adulte', 'part')])
    expect(!tropPct.ok && tropPct.erreur).toMatch(/dépassent 100 %/)

    // Seulement des « postes » : le transport n'est payé par personne
    const reste = calculerRepartition({ postes: { transport: 100, logement: 100 } }, [v('A', 'adulte', 'postes', { postes: ['logement'] })])
    expect(!reste.ok && reste.erreur).toMatch(/Personne ne paie le reste \(100,00 €\)/)

    // Un pourcentage de 100 % couvre tout : c'est possible
    const toutPct = calculerRepartition(voyage, [v('A', 'adulte', 'pourcentage', { pourcentage: 100 }), v('B', 'adulte', 'rien')])
    expect(toutPct.ok).toBe(true)
    expect(toutPct.parts.map((p) => p.montant)).toEqual([1000, 0])
  })

  it('fractions lisibles', () => {
    expect(fractionLisible(1 / 3)).toBe('1/3')
    expect(fractionLisible(2 / 3)).toBe('2/3')
    expect(fractionLisible(1)).toBe('')
    expect(fractionLisible(0.27)).toBe('27 %')
  })
})

describe('équilibrage après le voyage', () => {
  it('le moins de virements possible : Léa doit 86 € à Livio', () => {
    // Parts : Livio 500, Léa 400 ; Livio a avancé 586, Léa 314 → Léa doit 86 €
    const eq = equilibrer(
      [
        { id: 'livio', montant: 500 },
        { id: 'lea', montant: 400 },
        { id: 'tom', montant: 0 },
      ],
      [
        { payeur: 'livio', montant: 586 },
        { payeur: 'lea', montant: 314 },
      ],
    )
    expect(eq.virements).toEqual([{ de: 'lea', vers: 'livio', montant: 86 }])
    expect(eq.soldes.find((s) => s.id === 'tom')!.solde).toBe(0)
  })

  it('les virements soldent tout le monde, au centime près, en n − 1 virements au plus', () => {
    const parts = [
      { id: 'a', montant: 333.34 },
      { id: 'b', montant: 333.33 },
      { id: 'c', montant: 333.33 },
      { id: 'd', montant: 0 },
    ]
    const eq = equilibrer(parts, [
      { payeur: 'a', montant: 1000 },
      { payeur: 'd', montant: 12.5 },
    ])
    expect(eq.totalAvance).toBe(1012.5)
    expect(eq.virements.length).toBeLessThanOrEqual(3)
    const recu = new Map<string, number>()
    for (const v of eq.virements) {
      recu.set(v.vers, (recu.get(v.vers) ?? 0) + Math.round(v.montant * 100))
      recu.set(v.de, (recu.get(v.de) ?? 0) - Math.round(v.montant * 100))
    }
    for (const s of eq.soldes) expect(recu.get(s.id) ?? 0).toBe(Math.round(s.solde * 100))
    // d n'avait rien à payer : on lui rend ses 12,50 €
    expect(eq.soldes.find((s) => s.id === 'd')!.solde).toBe(12.5)
  })

  it('résumé texte à partager', () => {
    const r = calculerRepartition({ postes: { transport: 300 } }, [v('Livio', 'adulte', 'part'), v('Tom', 'adulte', 'rien')])
    const t = resumeTexte('Annecy', r, { virements: [{ de: 'Tom', vers: 'Livio', montant: 10 }], noms: new Map([['Tom', 'Tom'], ['Livio', 'Livio']]) })
    expect(t).toContain('• Livio : 300 € (Transport)')
    expect(t).toContain('• Tom : 0 € (invité : ne paie rien)')
    expect(t).toContain('• Tom doit 10 € à Livio')
  })
})
