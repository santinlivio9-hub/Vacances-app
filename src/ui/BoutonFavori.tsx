import { Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEstFavori, useFavoris, type Favori } from '../store/favoris'

/** Cœur pour ajouter ou retirer un favori. `surImage` : version blanche posée sur une photo. */
export function BoutonFavori({ favori, surImage = false, className = '' }: { favori: Omit<Favori, 'ajouteLe'>; surImage?: boolean; className?: string }) {
  const actif = useEstFavori(favori.id)
  const basculer = useFavoris((s) => s.basculer)
  return (
    <button
      type="button"
      aria-pressed={actif}
      aria-label={actif ? `Retirer « ${favori.nom} » des favoris` : `Ajouter « ${favori.nom} » aux favoris`}
      title={actif ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        basculer(favori)
      }}
      className={`grid size-10 shrink-0 place-items-center rounded-full transition ${
        surImage ? 'bg-black/30 text-white backdrop-blur hover:bg-black/45' : 'text-slate-500 hover:bg-corail-300/25 hover:text-corail-700 dark:text-slate-400'
      } ${className}`}
    >
      <motion.span key={String(actif)} initial={{ scale: actif ? 0.6 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} className="grid">
        <Heart className={`size-5 ${actif ? 'fill-corail-600 text-corail-600' : ''}`} aria-hidden />
      </motion.span>
    </button>
  )
}
