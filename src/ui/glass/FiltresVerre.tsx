/**
 * Filtre SVG de réfraction : déforme légèrement ce qui est vu à travers le bord du verre.
 * Utilisé par backdrop-filter: url(#refraction-verre) dans Chrome uniquement (voir index.css).
 */
export function FiltresVerre() {
  return (
    <svg aria-hidden width="0" height="0" className="pointer-events-none absolute">
      <filter id="refraction-verre" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="bruit" />
        <feGaussianBlur in="bruit" stdDeviation="2" result="doux" />
        <feDisplacementMap in="SourceGraphic" in2="doux" scale="18" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}
