import type { Compatibilite } from '../engine/budget'
import { formaterEuros } from '../lib/format'
import { libelleConfort, libelleMode, STATUTS } from '../lib/libelles'
import { boutonSecondaire } from '../lib/styles'
import { Jauge } from './Jauge'

interface Props {
  compatibilite: Compatibilite
  budget: number
  lienDetail: string
}

/** Carte du mode budget : statut (couleur + icône + texte), confort atteignable, marge et jauge. */
export function CarteCompatibilite({ compatibilite, budget, lienDetail }: Props) {
  const { destination, confort, resultat, marge, statut } = compatibilite
  const s = STATUTS[statut]
  const mode = resultat.transport ? libelleMode(resultat.transport.mode) : null

  return (
    <article className="verre flex flex-col gap-3 rounded-3xl border-l-4 p-5" style={{ borderLeftColor: s.couleur }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-3xl leading-none">
            {destination.emoji}
          </span>
          <div>
            <h3 className="font-semibold leading-tight">{destination.nom}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">{destination.pays}</p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.classeFond} ${s.classeTexte}`}>
          <span aria-hidden="true">{s.icone}</span>
          {s.libelle}
        </span>
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-200">
        {statut === 'depasse' ? (
          <>Même en éco, le budget est dépassé.</>
        ) : (
          <>
            Confort atteignable : <strong>{libelleConfort(confort)}</strong>
          </>
        )}
      </p>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold tabular-nums">{formaterEuros(resultat.total)}</span>
          <span className={`text-sm font-medium ${s.classeTexte}`}>
            {marge >= 0 ? `reste ${formaterEuros(marge)}` : `dépasse de ${formaterEuros(-marge)}`}
          </span>
        </div>
        <Jauge utilise={resultat.total} budget={budget} couleur={s.couleur} libelle={`Budget utilisé pour ${destination.nom}`} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {mode && (
            <>
              <span aria-hidden="true">{mode.icone}</span> {mode.libelle}
            </>
          )}
          {' · '}
          {formaterEuros(resultat.parPersonne)} / pers.
        </span>
        <a href={lienDetail} className={boutonSecondaire}>
          Voir le détail <span className="sr-only">pour {destination.nom}</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  )
}
