import { ExternalLink, Heart, MapPin, Sparkles, Ticket, Trash2, BedDouble, MapPinned } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useFavoris, type Favori, type TypeFavori } from '../store/favoris'
import { useVoyage } from '../store/voyage'
import { EnTetePage } from '../ui/EnTetePage'
import { formatEuros } from '../ui/format'

const TYPES: { id: TypeFavori; libelle: string; icone: typeof Heart }[] = [
  { id: 'destination', libelle: 'Destinations', icone: MapPin },
  { id: 'proposition', libelle: 'Propositions', icone: Sparkles },
  { id: 'logement', libelle: 'Logements', icone: BedDouble },
  { id: 'activite', libelle: 'Activités', icone: Ticket },
]

export default function Favoris() {
  const navigate = useNavigate()
  const { favoris, retirer } = useFavoris()
  const { definirArrivee, chargerVoyage } = useVoyage()
  const [filtre, setFiltre] = useState<TypeFavori | 'tout'>('tout')
  const visibles = favoris.filter((f) => filtre === 'tout' || f.type === filtre)

  function ouvrir(f: Favori) {
    if (f.type === 'destination' && f.lieu) {
      definirArrivee({ nom: f.nom, detail: f.detail, lat: f.lieu.lat, lon: f.lieu.lon, pays: f.lieu.pays, type: 'city' })
      navigate('/')
    } else if (f.type === 'proposition' && f.voyage) {
      chargerVoyage(f.voyage)
      navigate('/calcul?vers=voyage')
    } else if (f.lien) window.open(f.lien, '_blank', 'noopener')
  }

  return (
    <div className="min-h-dvh">
      <EnTetePage titre="Favoris" />
      <main className="mx-auto max-w-2xl px-3 py-4">
        {favoris.length > 0 && (
          <div role="group" aria-label="Filtrer les favoris" className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            {[{ id: 'tout' as const, libelle: 'Tout', icone: Heart }, ...TYPES].map((t) => {
              const n = t.id === 'tout' ? favoris.length : favoris.filter((f) => f.type === t.id).length
              if (t.id !== 'tout' && n === 0) return null
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={filtre === t.id}
                  onClick={() => setFiltre(t.id)}
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm ring-1 transition ${filtre === t.id ? 'bg-ocean-700 font-semibold text-white ring-ocean-700' : 'bg-white text-slate-700 ring-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10'}`}
                >
                  <t.icone className="size-4" aria-hidden /> {t.libelle} <span className="opacity-70">{n}</span>
                </button>
              )
            })}
          </div>
        )}

        {favoris.length === 0 ? (
          <div className="mt-16 text-center">
            <Heart className="mx-auto size-10 text-corail-600" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">Aucun favori</h2>
            <p className="mx-auto mt-1 max-w-xs text-slate-600 dark:text-slate-300">Touchez le cœur d’une destination, d’une activité, d’un logement ou d’une proposition pour la garder ici.</p>
            <button type="button" onClick={() => navigate('/')} className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-ocean-700 px-5 font-semibold text-white">
              <MapPinned className="size-5" aria-hidden /> Explorer la carte
            </button>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibles.map((f) => {
              const Icone = TYPES.find((t) => t.id === f.type)!.icone
              return (
                <li key={f.id} className="flex items-stretch overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
                  <button type="button" onClick={() => ouvrir(f)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-white/5">
                    <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-ocean-300 to-ocean-700 text-white">
                      {f.image ? <img src={f.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" /> : <Icone className="size-6" aria-hidden />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-ocean-700 uppercase dark:text-ocean-300">
                        <Icone className="size-3.5" aria-hidden /> {TYPES.find((t) => t.id === f.type)!.libelle.replace(/s$/, '')}
                      </span>
                      <span className="block truncate font-semibold">{f.nom}</span>
                      <span className="block truncate text-sm text-slate-600 dark:text-slate-300">
                        {f.voyage ? `≈ ${formatEuros(f.voyage.total)} · ${f.detail}` : f.detail}
                      </span>
                      {f.lien && f.type !== 'destination' && f.type !== 'proposition' && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <ExternalLink className="size-3" aria-hidden /> Ouvrir
                        </span>
                      )}
                    </span>
                  </button>
                  <button type="button" onClick={() => retirer(f.id)} className="grid w-12 shrink-0 place-items-center text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" aria-label={`Retirer « ${f.nom} » des favoris`}>
                    <Trash2 className="size-5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
