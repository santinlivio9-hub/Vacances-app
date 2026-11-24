import { Bus, Car, ChevronDown, Clock, ExternalLink, Footprints, ParkingSquare, Plane, TrainFront, TramFront, UsersRound, CarTaxiFront, Check } from 'lucide-react'
import { useState } from 'react'
import type { TypeTrajet } from '../domain/types'
import { lienEtape } from '../engine/liens'
import { NOMS_TRAJETS, type Etape, type ModeEtape, type OptionTrajet, type ResultatTrajets } from '../engine/trajets'
import { formatDuree, formatEntre, formatEuros } from '../ui/format'

export const ICONES_ETAPE: Record<ModeEtape, typeof Car> = {
  voiture: Car,
  covoiturage: UsersRound,
  autocar: Bus,
  train: TrainFront,
  avion: Plane,
  transports: TramFront,
  marche: Footprints,
  taxi: CarTaxiFront,
  parking: ParkingSquare,
}

const NOMS_ETAPE: Record<ModeEtape, string> = {
  voiture: 'Voiture',
  covoiturage: 'Covoiturage',
  autocar: 'Autocar',
  train: 'Train',
  avion: 'Vol',
  transports: 'Transports en commun',
  marche: 'À pied',
  taxi: 'Taxi ou VTC',
  parking: 'Parking',
}

/** Étapes qui comptent dans la frise (on n'affiche pas les quelques minutes à pied). */
const etapesVisibles = (o: OptionTrajet) => o.etapes.filter((e) => e.mode !== 'marche' && e.mode !== 'parking')

/** Badges : le moins cher, le plus rapide, le meilleur compromis (premier du classement). */
function badges(r: ResultatTrajets): Map<TypeTrajet, string[]> {
  const res = new Map<TypeTrajet, string[]>()
  if (r.options.length < 2) return res
  const ajouter = (t: TypeTrajet, b: string) => res.set(t, [...(res.get(t) ?? []), b])
  const realistes = r.options.filter((o) => !o.peuRealiste)
  if (realistes.length === 0) return res
  ajouter(realistes.reduce((a, o) => (o.total.milieu < a.total.milieu ? o : a)).type, 'Le moins cher')
  ajouter(realistes.reduce((a, o) => (o.dureeAllerMin < a.dureeAllerMin ? o : a)).type, 'Le plus rapide')
  return res
}

function Frise({ option }: { option: OptionTrajet }) {
  const etapes = etapesVisibles(option)
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1" aria-hidden>
      {etapes.map((e, i) => {
        const Icone = ICONES_ETAPE[e.mode]
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="h-px w-2 bg-current opacity-40" />}
            <span className="grid size-7 place-items-center rounded-full bg-ocean-100 text-ocean-800 dark:bg-ocean-800/60 dark:text-ocean-100">
              <Icone className="size-3.5" />
            </span>
          </span>
        )
      })}
    </span>
  )
}

function LigneEtape({ e, contexte }: { e: Etape; contexte?: ContexteLiens }) {
  const Icone = ICONES_ETAPE[e.mode]
  const lien = contexte ? lienEtape(e, contexte) : null
  const titre = e.mode === 'parking' ? `${e.detail ?? 'Parking'} · ${e.de}` : e.de === e.vers ? e.de : `${e.de} → ${e.vers}`
  return (
    <li className="flex gap-3 py-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-slate-200">
        <Icone className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words">
          <span className="text-slate-500 dark:text-slate-400">{NOMS_ETAPE[e.mode]} · </span>
          {titre}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {e.mode !== 'parking' && `${formatDuree(e.dureeMin)} · `}
          {e.prix.milieu > 0 ? `${formatEuros(e.prix.milieu)}${e.uneFois ? ' pour le séjour' : ' l’aller'}` : 'gratuit'}
          {e.prix.milieu > 0 && e.prix.haut - e.prix.bas >= 4 && ` (${formatEntre(e.prix)})`}
          {e.mode !== 'parking' && e.detail ? ` · ${e.detail}` : ''}
          {e.tarifOfficiel && ' · tarifs SNCF'}
        </p>
        {lien && (
          <a href={lien.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-ocean-800 ring-1 ring-ocean-700/20 hover:ring-ocean-500 dark:bg-[#0e1f45] dark:text-ocean-200 dark:ring-white/15">
            {lien.titre}
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">(nouvel onglet)</span>
            {lien.preRempli && <span className="ml-1 rounded-full bg-ocean-100 px-1.5 py-0.5 text-[10px] text-ocean-800 dark:bg-ocean-800 dark:text-ocean-100">pré-rempli</span>}
          </a>
        )}
      </div>
    </li>
  )
}

export interface ContexteLiens {
  aller: string
  retour: string
  adultes: number
  enfants: number
}

/**
 * Comparatif des trajets en cartes. En configuration : cartes compactes à choisir.
 * Dans « Mon voyage » : étapes détaillées avec un lien par étape.
 */
export function CartesTrajets({
  resultat,
  choisi,
  onChoisir,
  voyageurs,
  contexte,
  detaille = false,
  onChoisirDetaille,
}: {
  resultat: ResultatTrajets
  choisi?: TypeTrajet
  onChoisir?: (o: OptionTrajet) => void
  voyageurs: number
  contexte?: ContexteLiens
  detaille?: boolean
  /** Vue détaillée : bouton « Choisir ce trajet » sous les étapes */
  onChoisirDetaille?: (o: OptionTrajet) => void
}) {
  const [ouverte, setOuverte] = useState<TypeTrajet | null>(detaille ? (choisi ?? null) : null)
  const [voirEcartees, setVoirEcartees] = useState(false)
  const b = badges(resultat)
  if (resultat.options.length === 0) return <p className="rounded-2xl bg-(--statut-depasse)/10 px-3 py-2 text-sm text-(--statut-depasse-texte)">Aucun trajet possible avec ces réglages.</p>
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {[...resultat.options].sort((a, b) => Number(b.type === choisi) - Number(a.type === choisi)).map((o) => {
          const estChoisi = o.type === choisi
          const deplie = ouverte === o.type
          return (
            <li key={o.type} className={`rounded-2xl bg-white ring-1 transition dark:bg-[#0e1f45] ${estChoisi ? 'ring-2 ring-ocean-600 dark:ring-ocean-400' : 'ring-slate-900/10 dark:ring-white/10'}`}>
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => (onChoisir ? onChoisir(o) : setOuverte(deplie ? null : o.type))}
                  aria-pressed={onChoisir ? estChoisi : undefined}
                  aria-expanded={onChoisir ? undefined : deplie}
                  className="min-w-0 flex-1 p-3 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-semibold">{NOMS_TRAJETS[o.type]}</span>
                    {estChoisi && (onChoisir || onChoisirDetaille) && <Check className="size-4 shrink-0 text-ocean-700 dark:text-ocean-300" aria-label="choisi" />}
                    <span className="shrink-0 text-base font-bold tabular-nums">{formatEuros(o.total.milieu)}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <Frise option={o} />
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="size-3.5" aria-hidden />
                      {formatDuree(o.dureeAllerMin)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    {formatEntre(o.total)} · {formatEuros(o.total.milieu / Math.max(1, voyageurs))} / pers.
                  </span>
                  {(b.get(o.type)?.length || o.peuRealiste) && (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {b.get(o.type)?.map((x) => (
                        <span key={x} className="rounded-full bg-ocean-100 px-2 py-0.5 text-[11px] font-semibold text-ocean-800 dark:bg-ocean-800 dark:text-ocean-100">
                          {x}
                        </span>
                      ))}
                      {o.peuRealiste && <span className="rounded-full bg-(--statut-juste)/15 px-2 py-0.5 text-[11px] font-semibold text-(--statut-juste-texte)">{o.peuRealiste}</span>}
                    </span>
                  )}
                </button>
                {onChoisir && (
                  <button type="button" onClick={() => setOuverte(deplie ? null : o.type)} aria-expanded={deplie} aria-label={`Étapes du trajet ${NOMS_TRAJETS[o.type]}`} className="grid w-11 shrink-0 place-items-center border-l border-slate-900/5 text-slate-500 dark:border-white/10">
                    <ChevronDown className={`size-4 transition ${deplie ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                )}
              </div>
              {deplie && (
                <ol className="divide-y divide-slate-900/5 border-t border-slate-900/5 px-3 dark:divide-white/10 dark:border-white/10">
                  {o.etapes.map((e, i) => (
                    <LigneEtape key={i} e={e} contexte={contexte} />
                  ))}
                  {o.details
                    .filter((d) => d.libelle.startsWith('Bagages'))
                    .map((d) => (
                      <li key={d.libelle} className="py-2 text-xs text-slate-500 dark:text-slate-400">
                        {d.libelle} : {formatEuros(d.montant)}
                      </li>
                    ))}
                  {onChoisirDetaille && !estChoisi && (
                    <li className="py-3">
                      <button type="button" onClick={() => onChoisirDetaille(o)} className="h-11 w-full rounded-2xl bg-ocean-700 px-4 text-sm font-semibold text-white hover:bg-ocean-800">
                        Choisir ce trajet
                      </button>
                    </li>
                  )}
                </ol>
              )}
            </li>
          )
        })}
      </ul>
      {resultat.ecartees.length > 0 && (
        <div>
          <button type="button" onClick={() => setVoirEcartees(!voirEcartees)} aria-expanded={voirEcartees} className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <ChevronDown className={`size-3.5 transition ${voirEcartees ? 'rotate-180' : ''}`} aria-hidden />
            {resultat.ecartees.length} trajet{resultat.ecartees.length > 1 ? 's' : ''} écarté{resultat.ecartees.length > 1 ? 's' : ''}
          </button>
          {voirEcartees && (
            <ul className="mt-1 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {resultat.ecartees.map((e) => (
                <li key={e.type}>
                  <span className="font-medium">{NOMS_TRAJETS[e.type]}</span> : {e.raison}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
