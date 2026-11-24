import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import type { TypeVoyage } from '../domain/types'
import { LISTE_TYPES_VOYAGE } from '../tripTypes'
import { TYPES_VOYAGE_UI } from './libelles'

/** Grandes cartes illustrées du choix du type de voyage. */
export function ChoixTypeVoyage({ valeur, onChoisir }: { valeur: TypeVoyage | null; onChoisir: (t: TypeVoyage) => void }) {
  return (
    <div role="radiogroup" aria-label="Type de voyage" className="grid grid-cols-2 gap-3">
      {LISTE_TYPES_VOYAGE.map((t, i) => {
        const ui = TYPES_VOYAGE_UI[t.id]
        const choisi = valeur === t.id
        return (
          <motion.button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={choisi}
            onClick={() => onChoisir(t.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`group relative isolate flex min-h-40 flex-col overflow-hidden rounded-3xl p-4 text-left text-white shadow-md ring-offset-2 ring-offset-ocean-50 transition hover:-translate-y-0.5 hover:shadow-lg sm:min-h-44 dark:ring-offset-ocean-950 ${choisi ? 'ring-3 ring-ocean-500' : ''}`}
          >
            <span className={`absolute inset-0 -z-10 bg-gradient-to-br ${ui.degrade}`} />
            <ui.icone className="absolute -right-4 -bottom-4 -z-10 size-28 text-white/15 transition-transform group-hover:scale-110" aria-hidden strokeWidth={1.5} />
            <span className="grid size-10 place-items-center rounded-2xl bg-white/20 backdrop-blur">
              <ui.icone className="size-5" aria-hidden />
            </span>
            <span className="mt-3 text-lg leading-tight font-bold">{t.nom}</span>
            <span className="mt-1 text-sm leading-snug text-white/90">{t.accroche}</span>
            <span className="mt-auto pt-2 text-xs text-white/75">{ui.exemple}</span>
            {choisi && (
              <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-white text-ocean-700" aria-hidden>
                <Check className="size-4" strokeWidth={3} />
              </span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

/** Rappel compact du type choisi, pour en changer sans revenir aux grandes cartes. */
export function TypeVoyageCompact({ valeur, onChoisir }: { valeur: TypeVoyage; onChoisir: (t: TypeVoyage) => void }) {
  return (
    <div role="radiogroup" aria-label="Type de voyage" className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
      {LISTE_TYPES_VOYAGE.map((t) => {
        const ui = TYPES_VOYAGE_UI[t.id]
        const choisi = valeur === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={choisi}
            onClick={() => onChoisir(t.id)}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm ring-1 transition ${choisi ? 'bg-ocean-700 font-semibold text-white ring-ocean-700' : 'bg-white text-slate-700 ring-slate-900/10 hover:ring-ocean-400 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10'}`}
          >
            <ui.icone className="size-4" aria-hidden />
            {t.nom}
          </button>
        )
      })}
    </div>
  )
}
