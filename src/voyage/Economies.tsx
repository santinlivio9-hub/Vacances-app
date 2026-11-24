import { PiggyBank, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { ajusterAuBudget, fusionnerChangements } from '../engine/budget'
import type { EntreeCouts } from '../engine/couts'
import { formatEuros } from '../ui/format'

/** Suggestions d'économies chiffrées quand l'estimation dépasse le budget. */
export function Economies({ entree, budget, total, onAppliquer }: { entree: EntreeCouts; budget: number; total: number; onAppliquer: (c: ReturnType<typeof fusionnerChangements>) => void }) {
  // L'ajustement relance l'estimation des dizaines de fois : on le mémorise
  const ajustement = useMemo(() => ajusterAuBudget(entree, budget), [entree, budget])
  const depassement = total - budget
  if (depassement <= 0) return null
  const idsPlan = new Set(ajustement.plan.map((p) => p.id))

  return (
    <section aria-labelledby="titre-economies" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-(--statut-depasse)/30 dark:bg-[#0e1f45]">
      <h2 id="titre-economies" className="flex items-center gap-2 font-semibold">
        <PiggyBank className="size-5 text-(--statut-depasse-texte)" aria-hidden />
        {formatEuros(depassement)} au-dessus de votre budget
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {ajustement.atteignable
          ? `En combinant ${ajustement.plan.length} changement${ajustement.plan.length > 1 ? 's' : ''}, le voyage revient à environ ${formatEuros(ajustement.totalApresPlan)}.`
          : `Même en appliquant tout, le voyage coûterait encore environ ${formatEuros(ajustement.totalApresPlan)}. Raccourcir le séjour ou changer de destination aidera.`}
      </p>
      <ul className="mt-3 divide-y divide-slate-900/5 dark:divide-white/10">
        {ajustement.suggestions.slice(0, 6).map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {s.titre}
                {idsPlan.has(s.id) && <span className="ml-2 rounded-full bg-ocean-100 px-2 py-0.5 text-[11px] font-semibold text-ocean-800 dark:bg-ocean-800 dark:text-ocean-100">conseillé</span>}
              </p>
              <p className="text-sm font-semibold text-(--statut-ok-texte)">− {formatEuros(s.economie)}</p>
            </div>
            <button type="button" onClick={() => onAppliquer(fusionnerChangements([s]))} className="h-10 shrink-0 rounded-full px-4 text-sm font-semibold text-ocean-700 ring-1 ring-ocean-600/40 hover:bg-ocean-50 dark:text-ocean-200 dark:hover:bg-white/10">
              Appliquer
            </button>
          </li>
        ))}
      </ul>
      {ajustement.plan.length > 1 && (
        <button type="button" onClick={() => onAppliquer(fusionnerChangements(ajustement.plan))} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ocean-700 font-semibold text-white hover:bg-ocean-800">
          <Sparkles className="size-4" aria-hidden />
          Appliquer les {ajustement.plan.length} conseils
        </button>
      )}
    </section>
  )
}
