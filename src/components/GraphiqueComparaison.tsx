import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Postes } from '../engine/types'
import { formaterEuros } from '../lib/format'
import { POSTES } from '../lib/libelles'

export interface LigneComparaison {
  nom: string
  postes: Postes
}

const eurosCourts = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€` : `${v} €`)

/**
 * Barres empilées horizontales : plusieurs voyages comparés sur un même axe en euros.
 * Le tableau de comparaison affiché à côté sert de vue texte.
 */
export default function GraphiqueComparaison({ lignes }: { lignes: LigneComparaison[] }) {
  const donnees = lignes.map((l) => ({ nom: l.nom, ...l.postes }))
  return (
    <div className="h-full w-full text-xs" role="img" aria-label="Comparaison des coûts par poste ; le détail figure dans le tableau ci-dessous.">
      <ResponsiveContainer width="100%" height={70 * lignes.length + 90}>
        <BarChart data={donnees} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }} barCategoryGap={14}>
          <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.12} />
          <XAxis type="number" tickFormatter={eurosCourts} tick={{ fill: 'var(--encre-graphique)' }} stroke="currentColor" strokeOpacity={0.25} />
          <YAxis type="category" dataKey="nom" width={96} tick={{ fill: 'var(--encre-graphique)' }} stroke="currentColor" strokeOpacity={0.25} />
          <Tooltip
            cursor={{ fill: 'currentColor', fillOpacity: 0.06 }}
            formatter={(valeur) => formaterEuros(Number(valeur))}
            contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'var(--surface-graphique)', color: 'inherit' }}
          />
          <Legend
            iconType="circle"
            itemSorter={null}
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(nom) => <span style={{ color: 'var(--encre-graphique)' }}>{nom}</span>}
          />
          {POSTES.map((p) => (
            <Bar key={p.id} dataKey={p.id} name={p.libelle} stackId="total" fill={p.couleur} stroke="var(--surface-graphique)" strokeWidth={2} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
