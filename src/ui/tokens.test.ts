import { describe, expect, it } from 'vitest'
import { composer, contraste, couleurs as C, opacites as O } from './tokens'

/** Contraste minimum 4,5:1 pour le texte courant, sur le pire fond possible derrière le verre. */
describe('contraste du verre', () => {
  it('texte foncé sur verre clair, posé sur du blanc ou du bleu nuit (photo sombre)', () => {
    for (const fond of [C.blanc, C.ocean50, [70, 90, 110] as [number, number, number]]) {
      expect(contraste(C.encre, composer(C.blanc, O.regular, fond))).toBeGreaterThanOrEqual(4.5)
      expect(contraste(C.encreDouce, composer(C.blanc, O.thick, fond))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('texte blanc sur verre sombre, posé sur la nuit ou sur un halo bleu', () => {
    for (const fond of [C.nuit, C.nuitHalo]) expect(contraste(C.blanc, composer(C.verreSombre, O.sombre, fond))).toBeGreaterThanOrEqual(4.5)
  })

  it('texte blanc de la barre d’onglets bleue, même sur un fond blanc', () => {
    for (const fond of [C.blanc, C.ocean50, C.nuit]) expect(contraste(C.blanc, composer(C.verreBleu, O.navigation, fond))).toBeGreaterThanOrEqual(4.5)
  })

  it('icône de l’onglet choisi sur la sélection blanche', () => {
    expect(contraste(C.selection, C.blanc)).toBeGreaterThanOrEqual(4.5)
  })
})
