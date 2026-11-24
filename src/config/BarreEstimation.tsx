import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { etatBudget } from '../engine/couts'
import { formatEntre, formatEuros } from '../ui/format'
import { AnneauBudget, BadgeEcart, Montant } from '../ui/glass'
import { AvatarVoyageur } from '../ui/AvatarVoyageur'

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

export function BarreEstimation({ total, parPersonne, budget, provisoire, bloque, onCalculer, libelle = 'Estimation', precision, fourchette, parts }: { total: number; parPersonne: number; budget: number | null; provisoire: boolean; bloque: string | null; onCalculer: () => void; libelle?: string; precision?: string; fourchette?: { bas: number; haut: number }; parts?: { id: string; nom: string; montant: number }[] }) {
  const anime = useNombreAnime(total)
  const { statut, ratio } = etatBudget(total, budget)
  const s = statut === 'libre' ? null : STATUTS[statut]

  return (
    <div className="verre fixed inset-x-0 bottom-0 z-20 rounded-t-3xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [--verre-fond:0.94]">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        {s && budget != null && <AnneauBudget ratio={ratio} taille={46} epaisseur={4.5} className="text-slate-900 dark:text-white" />}
        <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{libelle}{provisoire ? ' (trajet en cours de calcul)' : ''}</p>
          <p className="flex items-baseline gap-2">
            <Montant valeur={anime} className="text-2xl leading-tight" />
            {!precision && !parts && <span className="truncate text-sm text-slate-500 dark:text-slate-400">{formatEuros(parPersonne)} / pers.</span>}
          </p>
          {parts && parts.length > 1 && (
            <ul aria-label="Ce que paie chacun" className="-mx-1 mt-0.5 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
              {parts.map((p, i) => (
                <li key={p.id} className={`flex shrink-0 items-center gap-1 rounded-full bg-slate-900/5 py-0.5 pr-2 pl-0.5 text-[11px] whitespace-nowrap dark:bg-white/10 ${p.montant === 0 ? 'opacity-70' : ''}`}>
                  <AvatarVoyageur nom={p.nom} index={i} taille={18} className="ring-1!" />
                  <span className="max-w-20 truncate">{p.nom}</span>
                  <span className="font-semibold tabular-nums">{formatEuros(p.montant)}</span>
                </li>
              ))}
            </ul>
          )}
          {fourchette && fourchette.haut > 0 && <p className="text-xs leading-snug text-slate-600 dark:text-slate-300">{formatEntre(fourchette)}</p>}
          {precision && <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">{precision}</p>}
          {s && budget != null && (
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-medium" style={{ color: s.texte }}>
              <s.icone className="size-3.5" aria-hidden />
              {s.libelle}
              <BadgeEcart total={total} budget={budget} />
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCalculer}
          disabled={!!bloque}
          title={bloque ?? undefined}
          className="flex h-13 shrink-0 items-center gap-2 rounded-2xl bouton-accent px-4 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
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
