import { ExternalLink, Info, RefreshCw, Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ActivitePlanifiee, Itineraire } from '../domain/types'
import { liensActivite } from '../engine/liens'
import { resumeWikipedia } from '../services/wikipedia'
import { formatEuros } from '../ui/format'
import { BoutonFavori } from '../ui/BoutonFavori'
import { COULEURS_JOURS, dateCourte, TYPES_ACTIVITE_UI } from './libelles'

/** Photo Wikipédia d'un lieu, chargée seulement quand la carte devient visible. */
function usePhoto(reference: string | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  useEffect(() => {
    if (!reference || !ref.current) return
    let actif = true
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        obs.disconnect()
        resumeWikipedia(reference).then((r) => actif && r?.image && setPhoto(r.image))
      },
      { rootMargin: '200px' },
    )
    obs.observe(ref.current)
    return () => {
      actif = false
      obs.disconnect()
    }
  }, [reference])
  return { ref, photo }
}

function CarteActivite({ activite, ville, numero, couleur, onRemplacer }: { activite: ActivitePlanifiee; ville: string; numero: number; couleur: string; onRemplacer: () => void }) {
  const { lieu } = activite
  const { ref, photo } = usePhoto(lieu.wikipedia)
  const liens = liensActivite(lieu, ville)
  return (
    <li className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-900/5 dark:bg-[#0e1f45] dark:ring-white/10">
      <div ref={ref} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-ocean-200 to-ocean-500 sm:size-24">
        {photo && <img onError={(e) => (e.currentTarget.style.display = 'none')} src={photo} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
        <span className="absolute top-1.5 left-1.5 grid size-6 place-items-center rounded-full text-xs font-bold text-white ring-2 ring-white" style={{ background: couleur }} aria-hidden>
          {numero}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-1">
          <p className="min-w-0 flex-1 pt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {activite.heure} · {TYPES_ACTIVITE_UI[lieu.type]}
          </p>
          <BoutonFavori
            className="-mt-1.5 -mr-1 print:hidden"
            favori={{ id: `activite:${lieu.id}`, type: 'activite', nom: lieu.nom, detail: `${TYPES_ACTIVITE_UI[lieu.type]} · ${ville}`, image: photo ?? undefined, lieu: { lat: lieu.lat, lon: lieu.lon }, ville, lien: liens.infos }}
          />
        </div>
        <h4 className="leading-snug font-semibold [text-wrap:pretty]">{lieu.nom}</h4>
        <p className={`text-sm font-semibold ${activite.prix === 0 ? 'text-(--statut-ok-texte)' : ''}`}>{activite.prix === 0 ? 'Gratuit' : activite.prixConnu ? formatEuros(activite.prix) : `≈ ${formatEuros(activite.prix)}`}
          {activite.prix > 0 && <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">{activite.prixConnu ? 'tarif OpenStreetMap' : 'prix estimé'}</span>}
        </p>
        <div className="mt-auto flex flex-wrap gap-1 pt-1.5 print:hidden">
          {liens.reserver && (
            <a href={liens.reserver} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-full bg-ocean-700 px-3 text-xs font-semibold text-white">
              <Ticket className="size-3.5" aria-hidden /> Réserver
            </a>
          )}
          <a href={liens.infos} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-ocean-700 ring-1 ring-ocean-600/40 dark:text-ocean-200">
            <Info className="size-3.5" aria-hidden /> Infos
          </a>
          <button type="button" onClick={onRemplacer} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-900/15 hover:bg-slate-50 dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/5" aria-label={`Remplacer ${lieu.nom}`}>
            <RefreshCw className="size-3.5" aria-hidden /> Remplacer
          </button>
        </div>
      </div>
    </li>
  )
}

export function OngletItineraire({ itineraire, ville, onRemplacer }: { itineraire: Itineraire; ville: string; onRemplacer: (jour: number, position: number) => void }) {
  let numero = 0
  return (
    <div className="space-y-5">
      {itineraire.source !== 'osm' && (
        <p className="flex items-start gap-2 rounded-2xl bg-(--statut-juste)/15 px-3 py-2 text-sm text-(--statut-juste-texte)">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {itineraire.source === 'wikipedia'
            ? 'Lieux trouvés grâce à Wikipédia (OpenStreetMap n’a pas répondu) : la sélection est plus restreinte.'
            : 'Aucun lieu précis trouvé autour de la destination : voici un programme type, à compléter sur place.'}
        </p>
      )}
      {itineraire.jours.map((j) => {
        const couleur = COULEURS_JOURS[j.index % COULEURS_JOURS.length]
        return (
          <section key={j.index} aria-labelledby={`jour-${j.index}`} className="break-inside-avoid">
            <div className="mb-2 flex items-baseline gap-2">
              <span className="grid size-8 shrink-0 place-items-center self-center rounded-full text-sm font-bold text-white" style={{ background: couleur }} aria-hidden>
                {j.index + 1}
              </span>
              <div className="min-w-0">
                <h3 id={`jour-${j.index}`} className="font-semibold">
                  <span className="sr-only">Jour {j.index + 1} : </span>
                  {j.titre}
                </h3>
                <p className="text-sm text-slate-500 first-letter:uppercase dark:text-slate-400">{dateCourte(j.date)}</p>
              </div>
            </div>
            {j.notes.map((n) => (
              <p key={n} className="mb-2 ml-10 text-sm text-slate-600 dark:text-slate-300">
                {n}
              </p>
            ))}
            {j.activites.length > 0 ? (
              <ol className="ml-0 space-y-2 sm:ml-10">
                {j.activites.map((a, k) => (
                  <CarteActivite key={a.lieu.id} activite={a} ville={ville} numero={++numero} couleur={couleur} onRemplacer={() => onRemplacer(j.index, k)} />
                ))}
              </ol>
            ) : (
              j.notes.length === 0 && <p className="ml-10 text-sm text-slate-500">Journée libre.</p>
            )}
          </section>
        )
      })}
      <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <ExternalLink className="size-3" aria-hidden /> Horaires et prix indicatifs : vérifiez-les avant de partir.
      </p>
    </div>
  )
}
