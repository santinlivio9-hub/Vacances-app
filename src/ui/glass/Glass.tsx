import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

export type VarianteVerre = 'regular' | 'clear' | 'thick'
export type FormeVerre = 'capsule' | 'rounded' | 'circle'
export type TeinteVerre = 'aucune' | 'bleu' | 'ocean' | 'corail' | 'vert'

/** Opacité de chaque variante (voir tokens.ts) : clear laisse voir la photo, thick sert sous du texte long. */
const FOND: Record<VarianteVerre, string> = {
  regular: '[--verre-fond:0.58] dark:[--verre-fond:0.5]',
  clear: '[--verre-fond:0.32] dark:[--verre-fond:0.3]',
  thick: '[--verre-fond:0.82] dark:[--verre-fond:0.72]',
}
const FORMES: Record<FormeVerre, string> = { capsule: 'rounded-full', rounded: 'rounded-3xl', circle: 'rounded-full aspect-square' }
const TEINTES: Record<TeinteVerre, string> = {
  aucune: '',
  bleu: '',
  ocean: 'bg-[linear-gradient(135deg,rgb(21_133_174/0.18),transparent)]',
  corail: 'bg-[linear-gradient(135deg,rgb(249_109_79/0.2),transparent)]',
  vert: 'bg-[linear-gradient(135deg,rgb(27_175_122/0.22),transparent)]',
}

type Props<T extends ElementType> = {
  as?: T
  variante?: VarianteVerre
  forme?: FormeVerre
  /** Réagit au survol et à l'appui (léger soulèvement, puis enfoncement) */
  interactif?: boolean
  teinte?: TeinteVerre
  /** Réfraction des bords (Chrome, effet complet) : à réserver aux grandes surfaces */
  refraction?: boolean
  className?: string
  children?: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

/**
 * Surface de verre. Pour rester lisible, pas plus de 4 ou 5 couches visibles à l'écran
 * (COUCHES_MAX dans tokens.ts) et jamais de verre posé sur du verre pour du texte long.
 */
export function Glass<T extends ElementType = 'div'>({ as, variante = 'regular', forme = 'rounded', interactif = false, teinte = 'aucune', refraction = false, className = '', children, ...reste }: Props<T>) {
  const Balise = (as ?? 'div') as ElementType
  const base = teinte === 'bleu' ? 'verre-bleu' : `verre ${FOND[variante]}`
  return (
    <Balise
      className={`${base} reflet ${FORMES[forme]} ${TEINTES[teinte]} ${refraction ? 'refraction' : ''} ${interactif ? 'eclat transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none' : ''} ${className}`}
      {...reste}
    >
      {children}
    </Balise>
  )
}
