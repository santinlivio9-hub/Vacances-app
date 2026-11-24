import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { POSTES, type EstimationCouts } from '../engine/couts'
import { TableauBudget } from './TableauBudget'
import { formatEuros } from '../ui/format'
import { POSTES_UI } from './libelles'

/** Répartition du budget : anneau + tableau détaillé (le tableau porte toute l'information). */
export default function OngletBudget({ couts }: { couts: EstimationCouts }) {
  const donnees = POSTES.filter((p) => couts.postes[p] > 0.5).map((p) => ({ poste: p, nom: POSTES_UI[p].libelle, valeur: couts.postes[p] }))
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[16rem_1fr] md:items-start">
      <div className="relative mx-auto h-64 w-64" aria-hidden>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={donnees} dataKey="valeur" nameKey="nom" innerRadius="62%" outerRadius="100%" paddingAngle={1.5} stroke="none" isAnimationActive={false}>
              {donnees.map((d) => (
                <Cell key={d.poste} fill={POSTES_UI[d.poste].couleur} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatEuros(Number(v))} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -8px rgb(0 0 0 / .3)' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-xl font-bold tabular-nums">{formatEuros(couts.total)}</p>
          </div>
        </div>
      </div>
      <TableauBudget couts={couts} />
    </div>
  )
}
