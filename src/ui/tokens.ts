/**
 * Jetons du style « Liquid Glass » (v6). Les couleurs et les flous vivent dans index.css
 * (variables CSS) ; ce fichier en garde la copie utilisée par le JavaScript (sélection liquide)
 * et par le test de contraste (tokens.test.ts).
 */

export type Rgb = [number, number, number]

export const couleurs = {
  /** Fond du mode sombre : nuit bleue étoilée (référence « Glassy Sidebar ») */
  nuit: [5, 11, 31] as Rgb,
  nuitHalo: [29, 63, 138] as Rgb,
  /** Fond du mode clair */
  ocean50: [238, 248, 251] as Rgb,
  blanc: [255, 255, 255] as Rgb,
  encre: [15, 23, 42] as Rgb, // slate-900
  encreDouce: [71, 85, 105] as Rgb, // slate-600
  /** Verre bleu de la navigation (les deux thèmes) */
  verreBleu: [28, 62, 132] as Rgb,
  /** Verre du mode sombre */
  verreSombre: [22, 46, 96] as Rgb,
  /** Texte sur la sélection blanche */
  selection: [12, 36, 82] as Rgb,
}

/** Opacité des surfaces de verre (0 = transparent, 1 = opaque) */
export const opacites = {
  regular: 0.58,
  clear: 0.32,
  thick: 0.82,
  navigation: 0.86,
  sombre: 0.5,
}

export const flous = {
  complet: 18,
  leger: 8,
}

export const rayons = {
  capsule: 9999,
  arrondi: 24,
  carte: 28,
}

/** Ressort de la sélection liquide : le bord qui avance part plus vite que celui qui suit, la forme s'étire. */
export const ressorts = {
  devant: { stiffness: 520, damping: 38, mass: 0.7 },
  derriere: { stiffness: 260, damping: 30, mass: 0.9 },
}

/** Nombre maximum de couches de verre visibles en même temps sur un écran */
export const COUCHES_MAX = 5

// ---------- Contraste (WCAG 2.1) ----------

const lineaire = (c: number) => {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
export const luminance = ([r, g, b]: Rgb) => 0.2126 * lineaire(r) + 0.7152 * lineaire(g) + 0.0722 * lineaire(b)
export function contraste(a: Rgb, b: Rgb): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
/** Couleur d'un verre d'opacité `alpha` posé sur un fond (le flou ne change pas la teinte moyenne). */
export const composer = (verre: Rgb, alpha: number, fond: Rgb): Rgb => verre.map((c, i) => Math.round(c * alpha + fond[i] * (1 - alpha))) as Rgb
