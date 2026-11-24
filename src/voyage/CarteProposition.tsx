import { AlertTriangle, Bookmark, Check, CheckCircle2, CircleAlert, Clock, Star } from 'lucide-react'
import { LOGEMENTS_UI, MODES_UI } from '../config/libelles'
import { BADGES, type Badge, type Proposition } from '../engine/propositions'
import { nomPeriode } from '../engine/periodes'
import type { Lieu } from '../domain/types'
import { imageLargeur } from '../services/wikipedia'
import { BoutonFavori } from '../ui/BoutonFavori'
import { formatDuree, formatEuros } from '../ui/format'

export const COULEURS_BADGES: Record<Badge, string> = {
  'moins-chere': 'bg-emerald-600 text-white',
  rapport: 'bg-ocean-700 text-white',
  confort: 'bg-violet-700 text-white',
  rapide: 'bg-amber-500 text-slate-950',
  proche: 'bg-amber-500 text-slate-950',
  choix: 'bg-white text-slate-900',
  variante: 'bg-slate-900/70 text-white',
  periode: 'bg-teal-700 text-white',
}

/** Couleur de l'écart au budget : vert (dans le budget), orange (moins de 10 % au-dessus), rouge. */
export function etatEcart(p: Proposition, budget: number | null) {
  if (budget == null || p.ecartBudget == null) return null
  if (p.ecartBudget <= 0) return { texte: `${formatEuros(-p.ecartBudget)} sous le budget`, icone: CheckCircle2, couleur: 'var(--statut-ok-texte)', fond: 'bg-(--statut-ok)/12' }
  if (p.ecartBudget <= budget * 0.1) return { texte: `${formatEuros(p.ecartBudget)} au-dessus du budget`, icone: CircleAlert, couleur: 'var(--statut-juste-texte)', fond: 'bg-(--statut-juste)/18' }
  return { texte: `${formatEuros(p.ecartBudget)} au-dessus du budget`, icone: AlertTriangle, couleur: 'var(--statut-depasse-texte)', fond: 'bg-(--statut-depasse)/12' }
}

interface Props {
  p: Proposition
  depart: Lieu
  arrivee: Lieu
  graine: number
  image?: string
  budget: number | null
  voyageurs: number
  comparer: boolean
  coche: boolean
  onCocher: () => void
  onChoisir: () => void
  onSauvegarder: () => void
}

export function CarteProposition({ p, depart, arrivee, graine, image, budget, voyageurs, comparer, coche, onCocher, onChoisir, onSauvegarder }: Props) {
  const Logement = LOGEMENTS_UI[p.logement].icone
  const Mode = MODES_UI[p.transport].icone
  const ecart = etatEcart(p, budget)
  const stage = !!p.sejourLong
  return (
    <article
      aria-labelledby={`titre-${p.id}`}
      className={`flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 transition dark:bg-slate-900 ${coche ? 'ring-2 ring-ocean-500' : 'ring-slate-900/5 dark:ring-white/10'}`}
    >
      <div className="relative h-32 shrink-0 bg-gradient-to-br from-ocean-300 to-ocean-700">
        {image && <img src={imageLargeur(image, 640)} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
        <div className="absolute top-2.5 left-2.5 flex max-w-[calc(100%-4rem)] flex-wrap gap-1">
          {p.badges.map((b) => (
            <span key={b} className={`rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${COULEURS_BADGES[b]}`}>
              {b === 'variante' || b === 'periode' ? p.titre : BADGES[b]}
            </span>
          ))}
        </div>
        <BoutonFavori
          surImage
          className="absolute top-2 right-2"
          favori={{
            id: `proposition:${p.id}:${arrivee.lat.toFixed(3)},${arrivee.lon.toFixed(3)}`,
            type: 'proposition',
            nom: `${arrivee.nom} : ${p.titre.toLowerCase()}`,
            detail: p.sousTitre,
            image: image ? imageLargeur(image, 400) : undefined,
            voyage: { depart, arrivee, reglages: p.reglages, graine, total: p.total },
          }}
        />
        <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2 text-white">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
            <Logement className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{LOGEMENTS_UI[p.logement].libelle}</span>
          </p>
          <p className="flex shrink-0 items-center gap-1 text-sm">
            {stage ? (
              <>
                <Clock className="size-4" aria-hidden /> ≤ {p.dureeTrajetMin} min du travail
              </>
            ) : (
              <>
                <Mode className="size-4" aria-hidden /> {formatDuree(p.dureeTrajetMin)}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 id={`titre-${p.id}`} className="sr-only">
          {p.titre}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {p.sousTitre}
          {p.periode && ` · ${nomPeriode(p.periode)}`}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
          <span className="text-3xl font-bold tabular-nums">{formatEuros(p.total)}</span>
          <span className="text-sm text-slate-500 tabular-nums dark:text-slate-400">
            {stage && p.sejourLong ? `${formatEuros(p.sejourLong.totalMensuel)} / mois` : voyageurs > 1 ? `${formatEuros(p.parPersonne)} / pers.` : 'au total'}
          </span>
          <span className="ml-auto inline-flex items-center gap-0.5 text-sm font-semibold text-amber-600 dark:text-amber-400" title="Confort estimé">
            <Star className="size-4 fill-current" aria-hidden /> {p.confort.toLocaleString('fr-FR')}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/10</span>
            <span className="sr-only"> de confort</span>
          </span>
        </div>
        {ecart && (
          <p className={`mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ecart.fond}`} style={{ color: ecart.couleur }}>
            <ecart.icone className="size-3.5" aria-hidden /> {ecart.texte}
          </p>
        )}
        <ul className="mt-3 space-y-1 text-sm">
          {p.pointsForts.map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-(--statut-ok-texte)" aria-hidden strokeWidth={3} />
              <span>{t}</span>
            </li>
          ))}
          {p.pointsFaibles.map((t) => (
            <li key={t} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-(--statut-juste-texte)" aria-hidden />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center gap-2 pt-4">
          {comparer ? (
            <button
              type="button"
              aria-pressed={coche}
              onClick={onCocher}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl font-semibold ring-1 transition ${coche ? 'bg-ocean-700 text-white ring-ocean-700' : 'text-ocean-800 ring-ocean-600/40 hover:bg-ocean-50 dark:text-ocean-100 dark:hover:bg-white/5'}`}
            >
              <span className={`grid size-5 place-items-center rounded-md ring-2 ${coche ? 'bg-white text-ocean-700 ring-white' : 'ring-current'}`} aria-hidden>
                {coche && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              {coche ? 'Sélectionnée' : 'Comparer'}
            </button>
          ) : (
            <>
              <button type="button" onClick={onChoisir} className="h-12 flex-1 rounded-2xl bg-corail-700 px-4 font-semibold text-white shadow-md shadow-corail-700/20 hover:bg-[#a83522]">
                Choisir cette proposition
              </button>
              <button type="button" onClick={onSauvegarder} className="grid size-12 shrink-0 place-items-center rounded-2xl text-ocean-800 ring-1 ring-slate-900/10 hover:bg-ocean-50 dark:text-ocean-100 dark:ring-white/15 dark:hover:bg-white/5" aria-label={`Sauvegarder « ${p.titre} »`} title="Sauvegarder">
                <Bookmark className="size-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
