import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { etatBudget } from '../engine/couts'
import { formatEuros } from '../ui/format'

/** Nombre qui glisse vers sa nouvelle valeur (désactivé si l'utilisateur préfère moins d'animations). */
export function useNombreAnime(cible: number, dureeMs = 350): number {
  const [valeur, setValeur] = useState(cible)
  const depart = useRef(cible)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValeur(cible)
      return
    }
    const de = depart.current
    const t0 = performance.now()
    let image = 0
    const pas = (t: number) => {
      const f = Math.min(1, (t - t0) / dureeMs)
      const v = de + (cible - de) * (1 - (1 - f) ** 3)
      depart.current = v
      setValeur(v)
      if (f < 1) image = requestAnimationFrame(pas)
    }
    image = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(image)
  }, [cible, dureeMs])
  return valeur
}

const STATUTS = {
  ok: { libelle: 'Dans le budget', icone: CheckCircle2, couleur: 'var(--statut-ok)', texte: 'var(--statut-ok-texte)' },
  juste: { libelle: 'Budget juste', icone: CircleAlert, couleur: 'var(--statut-juste)', texte: 'var(--statut-juste-texte)' },
  depasse: { libelle: 'Budget dépassé', icone: AlertTriangle, couleur: 'var(--statut-depasse)', texte: 'var(--statut-depasse-texte)' },
}

export function BarreEstimation({ total, parPersonne, budget, provisoire, bloque, onCalculer }: { total: number; parPersonne: number; budget: number | null; provisoire: boolean; bloque: string | null; onCalculer: () => void }) {
  const anime = useNombreAnime(total)
  const { statut, ratio } = etatBudget(total, budget)
  const s = statut === 'libre' ? null : STATUTS[statut]

  return (
    <div className="verre fixed inset-x-0 bottom-0 z-20 rounded-t-3xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [--verre-fond:0.94]">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
          <p className="text-xs text-slate-500 dark:text-slate-400">Estimation{provisoire ? ' (trajet en cours de calcul)' : ''}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-2xl leading-tight font-bold tabular-nums">{formatEuros(anime)}</span>
            <span className="truncate text-sm text-slate-500 dark:text-slate-400">{formatEuros(parPersonne)} / pers.</span>
          </p>
          {s && budget != null && (
            <div className="mt-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label="Part du budget utilisée">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.min(100, ratio * 100)}%`, background: s.couleur }} />
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium" style={{ color: s.texte }}>
                <s.icone className="size-3.5" aria-hidden />
                {s.libelle} : {Math.round(ratio * 100)} % de {formatEuros(budget)}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onCalculer}
          disabled={!!bloque}
          title={bloque ?? undefined}
          className="flex h-13 shrink-0 items-center gap-2 rounded-2xl bg-corail-700 px-4 font-semibold text-white shadow-lg shadow-corail-700/25 transition hover:bg-[#a83522] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
        >
          <span className="hidden sm:inline">Calculer mon voyage</span>
          <span className="sm:hidden">Calculer</span>
          <ArrowRight className="size-5" aria-hidden />
        </button>
      </div>
      {bloque && <p className="mx-auto mt-1 max-w-2xl text-xs text-(--statut-depasse-texte)">{bloque}</p>}
    </div>
  )
}
