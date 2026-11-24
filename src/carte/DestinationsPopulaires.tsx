import { useEffect, useState } from 'react'
import { destinationsPopulaires, type DestinationPopulaire } from '../data'
import type { Lieu } from '../domain/types'
import { enParallele } from '../services/reseau'
import { resumeWikipedia } from '../services/wikipedia'

/** Vignettes (≈ 400 px) des destinations populaires, chargées en arrière-plan, 3 à la fois. */
function useVignettes(destinations: DestinationPopulaire[]) {
  const [images, setImages] = useState<Record<string, string | undefined>>({})
  useEffect(() => {
    let actif = true
    void enParallele(destinations, 3, async (d) => {
      const r = await resumeWikipedia(d.wikipedia)
      if (actif && r?.image) setImages((i) => ({ ...i, [d.nom]: r.image }))
    })
    return () => {
      actif = false
    }
  }, [destinations])
  return images
}

export function DestinationsPopulaires({ onChoisir }: { onChoisir: (lieu: Lieu) => void }) {
  const images = useVignettes(destinationsPopulaires)
  return (
    <section aria-labelledby="titre-populaires">
      <h2 id="titre-populaires" className="px-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Envie d’ailleurs ? Destinations populaires
      </h2>
      <ul className="mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {destinationsPopulaires.map((d) => (
          <li key={d.nom} className="snap-start">
            <button
              type="button"
              onClick={() => onChoisir({ nom: d.nom, detail: d.detail, lat: d.lat, lon: d.lon, pays: d.pays, type: 'city' })}
              className="group relative block h-28 w-32 overflow-hidden rounded-2xl bg-gradient-to-br from-ocean-400 to-ocean-700 text-left shadow-sm ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:outline-none"
            >
              {images[d.nom] && (
                <img src={images[d.nom]} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute inset-x-2 bottom-2 text-white">
                <span className="block text-sm leading-tight font-semibold">{d.nom}</span>
                <span className="block truncate text-[11px] text-white/85">{d.detail.split(', ').at(-1)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
