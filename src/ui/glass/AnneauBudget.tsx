import { motion } from 'framer-motion'
import { useId } from 'react'
import { formatEuros } from '../format'

/** Couleur de l'anneau : vert tant qu'il reste de la marge, or à l'approche du budget, rouge au-delà. */
export function couleurAnneau(ratio: number): { de: string; a: string } {
  if (ratio > 1) return { de: '#ff8a7a', a: '#e5484d' }
  if (ratio > 0.75) return { de: '#ffe08a', a: '#e0a526' }
  return { de: '#7ee2a8', a: '#2fb36d' }
}

/**
 * Anneau de progression doré (référence « Glassy Sidebar », carte Go Pro) : part du budget utilisée.
 * Le pourcentage est écrit au centre ; au-delà de 100 %, l'anneau est plein et rouge.
 */
export function AnneauBudget({ ratio, taille = 56, epaisseur = 5, className = '' }: { ratio: number; taille?: number; epaisseur?: number; className?: string }) {
  const id = `anneau-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const r = (taille - epaisseur) / 2
  const c = 2 * Math.PI * r
  const { de, a } = couleurAnneau(ratio)
  const pct = Math.round(ratio * 100)
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: taille, height: taille }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, pct)} aria-label={`Part du budget utilisée : ${pct} %`}>
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={de} />
            <stop offset="1" stopColor={a} />
          </linearGradient>
        </defs>
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={epaisseur} />
        <motion.circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - Math.min(1, ratio)) }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          style={{ filter: `drop-shadow(0 0 4px ${a}66)` }}
        />
      </svg>
      <span className="relative text-[11px] font-bold tabular-nums" style={{ fontSize: taille < 48 ? 10 : 12 }}>
        {pct > 999 ? '999+' : pct}
        <span className="opacity-60">%</span>
      </span>
    </span>
  )
}

/** Badge d'écart avec le budget, vert sous le budget, rouge au-dessus (référence « Glassy Dashboard »). */
export function BadgeEcart({ total, budget, sombre = false }: { total: number; budget: number; sombre?: boolean }) {
  const ecart = total - budget
  const dessus = ecart > 0
  const couleurs = sombre
    ? dessus
      ? 'bg-[#e5484d]/25 text-[#ffb4ab] ring-[#ffb4ab]/30'
      : 'bg-[#2fb36d]/25 text-[#a6f0c6] ring-[#a6f0c6]/30'
    : dessus
      ? 'bg-(--statut-depasse)/12 text-(--statut-depasse-texte) ring-(--statut-depasse)/25'
      : 'bg-(--statut-ok)/12 text-(--statut-ok-texte) ring-(--statut-ok)/25'
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums ring-1 ${couleurs}`}>
      {dessus ? '↑' : '↓'} {formatEuros(Math.abs(ecart))} {dessus ? 'au-dessus' : 'sous le budget'}
    </span>
  )
}
