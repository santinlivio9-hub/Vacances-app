import { Flag, Loader2, MapPin, X } from 'lucide-react'
import type { Lieu } from '../domain/types'

interface Props {
  lieu: Lieu | null
  onDepart: () => void
  onArrivee: () => void
  onFermer: () => void
}

/** Menu affiché après un clic (ou appui long) sur la carte : « Partir d'ici » / « Aller ici ». */
export function MenuPoint({ lieu, onDepart, onArrivee, onFermer }: Props) {
  return (
    <section aria-label="Point choisi sur la carte" className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-900/5 dark:bg-white/10">
          <MapPin className="size-5 text-slate-600 dark:text-slate-300" aria-hidden />
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          {lieu ? (
            <>
              <p className="truncate font-semibold">{lieu.nom}</p>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{lieu.detail || 'Point sur la carte'}</p>
            </>
          ) : (
            <p className="flex h-10 items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Recherche de l’adresse…
            </p>
          )}
        </div>
        <button type="button" onClick={onFermer} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10" aria-label="Fermer">
          <X className="size-5" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={!lieu} onClick={onDepart} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ocean-700 font-semibold text-white disabled:opacity-50">
          <span className="grid size-5 place-items-center rounded-full bg-white text-xs font-bold text-ocean-700">A</span>
          Partir d’ici
        </button>
        <button type="button" disabled={!lieu} onClick={onArrivee} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-corail-700 font-semibold text-white disabled:opacity-50">
          <Flag className="size-4" aria-hidden />
          Aller ici
        </button>
      </div>
    </section>
  )
}
