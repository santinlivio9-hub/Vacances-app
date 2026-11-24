import { POSTES, type EstimationCouts } from '../engine/couts'
import { formatEuros } from '../ui/format'
import { POSTES_UI } from './libelles'

/** Tableau détaillé du budget (sans graphique : utilisable à l'impression sans charger Recharts). */
export function TableauBudget({ couts }: { couts: EstimationCouts }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Détail du budget par poste</caption>
      <tbody>
        {POSTES.filter((p) => couts.postes[p] > 0.5).map((p) => (
          <tr key={p} className="border-b border-slate-900/5 align-top last:border-0 dark:border-white/10">
            <th scope="row" className="py-2.5 pr-3 text-left font-normal">
              <span className="flex items-center gap-2 font-semibold">
                <span className="size-3 shrink-0 rounded-sm" style={{ background: POSTES_UI[p].couleur }} aria-hidden />
                {POSTES_UI[p].libelle}
                <span className="font-normal text-slate-500 dark:text-slate-400">{Math.round((couts.postes[p] / couts.total) * 100)} %</span>
              </span>
              {couts.details[p].map((d) => (
                <span key={d.libelle} className="mt-0.5 block pl-5 text-xs text-slate-500 dark:text-slate-400">
                  {d.libelle}
                  {couts.details[p].length > 1 && ` : ${formatEuros(d.montant)}`}
                </span>
              ))}
            </th>
            <td className="py-2.5 text-right font-semibold whitespace-nowrap tabular-nums">{formatEuros(couts.postes[p])}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className="pt-3 text-left font-semibold">
            Total <span className="font-normal text-slate-500 dark:text-slate-400">· {formatEuros(couts.parPersonne)} par personne</span>
          </th>
          <td className="pt-3 text-right text-base font-bold tabular-nums">{formatEuros(couts.total)}</td>
        </tr>
      </tfoot>
    </table>
  )
}
