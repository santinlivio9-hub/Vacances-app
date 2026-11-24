import { Trophy } from 'lucide-react'
import { LOGEMENTS_UI, MODES_UI } from '../config/libelles'
import type { Proposition } from '../engine/propositions'
import { formatDuree, formatEuros } from '../ui/format'

interface Ligne {
  libelle: string
  valeurs: (number | string)[]
  format?: (v: number) => string
  /** Quelle valeur est la meilleure : la plus petite (coûts, durées) ou la plus grande (confort) */
  meilleur?: 'min' | 'max'
}

/** Tableau côte à côte de 2 ou 3 propositions ; la meilleure valeur de chaque ligne est mise en évidence. */
export function TableauComparaison({ propositions }: { propositions: Proposition[] }) {
  const stage = propositions.some((p) => p.sejourLong)
  const ids = [...new Set(propositions.flatMap((p) => p.postes.map((x) => x.id)))]
  const libellePoste = (id: string) => propositions.flatMap((p) => p.postes).find((x) => x.id === id)?.libelle ?? id
  const lignes: Ligne[] = [
    { libelle: 'Total', valeurs: propositions.map((p) => p.total), format: formatEuros, meilleur: 'min' },
    stage
      ? { libelle: 'Par mois', valeurs: propositions.map((p) => p.sejourLong?.totalMensuel ?? 0), format: formatEuros, meilleur: 'min' }
      : { libelle: 'Par personne', valeurs: propositions.map((p) => p.parPersonne), format: formatEuros, meilleur: 'min' },
    { libelle: 'Confort (sur 10)', valeurs: propositions.map((p) => p.confort), format: (v) => v.toLocaleString('fr-FR'), meilleur: 'max' },
    { libelle: 'Type de logement', valeurs: propositions.map((p) => LOGEMENTS_UI[p.logement].libelle) },
    stage
      ? { libelle: 'Trajet jusqu’au travail', valeurs: propositions.map((p) => p.dureeTrajetMin), format: (v) => `≤ ${v} min`, meilleur: 'min' }
      : { libelle: 'Mode de transport', valeurs: propositions.map((p) => MODES_UI[p.transport].libelle) },
    ...(stage ? [] : [{ libelle: 'Temps de trajet (aller)', valeurs: propositions.map((p) => p.dureeTrajetMin), format: formatDuree, meilleur: 'min' as const }]),
    ...(stage ? [] : [{ libelle: 'Activités prévues', valeurs: propositions.map((p) => p.nbActivites), format: (v: number) => String(v), meilleur: 'max' as const }]),
    ...ids
      .filter((id) => propositions.some((p) => (p.postes.find((x) => x.id === id)?.montant ?? 0) >= 1))
      .map((id) => ({ libelle: libellePoste(id), valeurs: propositions.map((p) => p.postes.find((x) => x.id === id)?.montant ?? 0), format: formatEuros, meilleur: 'min' as const })),
  ]

  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[22rem] border-separate border-spacing-0 text-sm">
        <caption className="sr-only">Comparaison des propositions sélectionnées</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-white p-2 text-left font-medium text-slate-500 dark:bg-[#0e1f45] dark:text-slate-400">
              <span className="sr-only">Critère</span>
            </th>
            {propositions.map((p) => (
              <th key={p.id} scope="col" className="min-w-28 p-2 text-left align-bottom">
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{p.sousTitre}</span>
                <span className="block leading-tight font-semibold">{p.titre}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const nombres = l.valeurs.filter((v): v is number => typeof v === 'number')
            const cible = l.meilleur && nombres.length > 1 && new Set(nombres.map((n) => Math.round(n))).size > 1 ? (l.meilleur === 'min' ? Math.min(...nombres) : Math.max(...nombres)) : null
            return (
              <tr key={l.libelle} className="border-t">
                <th scope="row" className="sticky left-0 z-10 border-t border-slate-900/5 bg-white p-2 text-left font-medium text-slate-600 dark:border-white/10 dark:bg-[#0e1f45] dark:text-slate-300">
                  {l.libelle}
                </th>
                {l.valeurs.map((v, i) => {
                  const meilleur = cible != null && v === cible
                  return (
                    <td key={i} className={`border-t border-slate-900/5 p-2 tabular-nums dark:border-white/10 ${meilleur ? 'font-bold text-(--statut-ok-texte)' : ''}`}>
                      <span className={`inline-flex items-center gap-1 ${meilleur ? 'rounded-full bg-(--statut-ok)/12 px-2 py-0.5' : ''}`}>
                        {meilleur && <Trophy className="size-3.5" aria-hidden />}
                        {typeof v === 'number' && l.format ? l.format(v) : v}
                        {meilleur && <span className="sr-only"> (la meilleure)</span>}
                      </span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
