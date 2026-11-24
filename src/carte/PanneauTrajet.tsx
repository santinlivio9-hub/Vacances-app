import { ArrowRight, Bus, Car, Clock, ExternalLink, Info, LocateFixed, Plane, Route, TrainFront, UsersRound } from 'lucide-react'
import type { Lieu, ModeTransport, ResumeWikipedia } from '../domain/types'
import { apercuPrix } from '../engine/apercu'
import { moisDe } from '../engine/dates'
import { imageLargeur } from '../services/wikipedia'
import { formatDuree, formatEuros, formatKm } from '../ui/format'
import type { ItineraireCarte } from './itineraire'
import { idFavoriDestination } from '../store/favoris'
import { BoutonFavori } from '../ui/BoutonFavori'

export const ICONES_MODE: Record<ModeTransport, typeof Car> = { voiture: Car, train: TrainFront, avion: Plane, car: Bus, covoiturage: UsersRound }
export const NOMS_MODE: Record<ModeTransport, string> = { voiture: 'voiture', train: 'train', avion: 'avion', car: 'autocar', covoiturage: 'covoiturage' }

interface Props {
  depart: Lieu | null
  arrivee: Lieu
  itineraire: ItineraireCarte | null
  resume: ResumeWikipedia | null | undefined
  nuits: number
  dateDepart: string
  onConfigurer: () => void
  onMaPosition: () => void
}

function Squelette({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded bg-slate-900/10 dark:bg-white/10 ${className}`} />
}

export function PanneauTrajet({ depart, arrivee, itineraire, resume, nuits, dateDepart, onConfigurer, onMaPosition }: Props) {
  const apercu = itineraire
    ? apercuPrix({
        arrivee,
        distanceVolKm: itineraire.distanceVolKm,
        distanceRouteKm: itineraire.distanceRouteKm,
        routeTerrestre: itineraire.routeTerrestre,
        nuits,
        mois: moisDe(dateDepart),
      })
    : null
  const IconeMode = itineraire ? ICONES_MODE[itineraire.mode] : Route

  return (
    <article aria-label={`Trajet vers ${arrivee.nom}`}>
      <div className="relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br from-ocean-300 to-ocean-700 sm:h-44">
        {resume?.image && <img onError={(e) => (e.currentTarget.style.display = 'none')} src={imageLargeur(resume.image, 500)} alt={`Vue de ${arrivee.nom}`} className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
        <BoutonFavori
          surImage
          className="absolute top-2 right-2"
          favori={{ id: idFavoriDestination(arrivee), type: 'destination', nom: arrivee.nom, detail: arrivee.detail, image: resume?.image ? imageLargeur(resume.image, 400) : undefined, lieu: { lat: arrivee.lat, lon: arrivee.lon, pays: arrivee.pays } }}
        />
        <div className="absolute inset-x-4 bottom-3 text-white">
          <h2 className="text-2xl leading-tight font-bold [text-wrap:balance]">{arrivee.nom}</h2>
          {arrivee.detail && <p className="truncate text-sm text-white/90">{arrivee.detail}</p>}
        </div>
      </div>

      {resume === undefined ? (
        <div className="mt-3 space-y-2" aria-hidden>
          <Squelette className="h-3 w-full" />
          <Squelette className="h-3 w-4/5" />
        </div>
      ) : resume ? (
        <p className="mt-3 line-clamp-2 text-sm sm:line-clamp-3 text-slate-700 dark:text-slate-300">
          {resume.extrait}{' '}
          <a href={resume.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-ocean-700 underline-offset-2 hover:underline dark:text-ocean-300">
            Wikipédia
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </p>
      ) : null}

      {!depart ? (
        <div className="mt-4 rounded-2xl bg-ocean-100/70 p-3 text-sm text-ocean-900 dark:bg-ocean-900/50 dark:text-ocean-100">
          <p>D’où partez-vous ? Saisissez une ville en haut, touchez la carte, ou :</p>
          <button type="button" onClick={onMaPosition} className="mt-2 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 font-semibold text-ocean-700 shadow-sm dark:bg-ocean-800 dark:text-white">
            <LocateFixed className="size-4" aria-hidden />
            Partir de ma position
          </button>
        </div>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-900/[0.04] px-2 py-2.5 dark:bg-white/5">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{itineraire?.genre === 'vol' ? 'À vol d’oiseau' : 'Distance'}</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{itineraire ? formatKm(itineraire.genre === 'vol' ? itineraire.distanceVolKm : itineraire.distanceRouteKm) : <Squelette className="mx-auto h-4 w-14" />}</dd>
            </div>
            <div className="rounded-2xl bg-slate-900/[0.04] px-2 py-2.5 dark:bg-white/5">
              <dt className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="size-3" aria-hidden /> {itineraire?.genre === 'vol' || itineraire?.mode === 'avion' ? 'En avion' : 'En voiture'}
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{itineraire ? `≈ ${formatDuree(itineraire.dureeMin)}` : <Squelette className="mx-auto h-4 w-14" />}</dd>
            </div>
            <div className="rounded-2xl bg-slate-900/[0.04] px-2 py-2.5 dark:bg-white/5">
              <dt className="text-xs text-slate-500 dark:text-slate-400">Conseillé</dt>
              <dd className="mt-0.5 flex items-center justify-center gap-1 font-semibold">
                {itineraire ? (
                  <>
                    <IconeMode className="size-4" aria-hidden />
                    {NOMS_MODE[itineraire.mode]}
                  </>
                ) : (
                  <Squelette className="h-4 w-14" />
                )}
              </dd>
            </div>
          </dl>
          {itineraire?.genre === 'estimation' && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              Calcul d’itinéraire indisponible : distance estimée à partir de la ligne droite.
            </p>
          )}

          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">À partir de</p>
              <p className="text-2xl leading-tight font-bold tabular-nums">
                {apercu ? formatEuros(apercu.parPersonne) : <Squelette className="h-7 w-20" />}
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400"> / pers.</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {nuits} nuit{nuits > 1 ? 's' : ''}, style Éco, aller-retour {apercu ? `en ${NOMS_MODE[apercu.mode]}` : ''} compris
              </p>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-3 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pt-3 pb-1 dark:from-[#10283a] dark:via-[#10283a]/95 dark:to-transparent">
          <button
            type="button"
            onClick={onConfigurer}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bouton-accent px-5 text-base font-semibold text-white transition active:scale-[0.99]"
          >
            Configurer mon voyage
            <ArrowRight className="size-5" aria-hidden />
          </button>
          </div>
        </>
      )}
    </article>
  )
}
