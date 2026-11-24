import { Compass, Heart, Luggage, Moon, PanelLeftClose, PanelLeftOpen, Sun, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { useCompte } from '../compte/compte'
import { useVoyage } from '../store/voyage'
import { useFavoris } from '../store/favoris'
import { usePreferences } from '../store/preferences'
import { LiquidSelector, useCibleActive } from './glass'

export const ONGLETS_APP = [
  { vers: '/', libelle: 'Explorer', icone: Compass },
  { vers: '/mes-voyages', libelle: 'Mes voyages', icone: Luggage },
  { vers: '/favoris', libelle: 'Favoris', icone: Heart },
  { vers: '/compte', libelle: 'Compte', icone: UserRound },
] as const

/** Largeur du rail blanc de la barre latérale ouverte */
const RAIL = 56
const ENCRE_SELECTION = 'text-[#0c2452]'

function useOngletActif() {
  const { pathname } = useLocation()
  return ONGLETS_APP.find((o) => (o.vers === '/' ? pathname === '/' : pathname.startsWith(o.vers)))?.vers ?? null
}

/** La barre d'onglets rétrécit quand on descend dans la page et revient quand on remonte. */
function useCompactAuDefilement() {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    let dernier = window.scrollY
    const suivre = () => {
      const y = window.scrollY
      if (Math.abs(y - dernier) < 8) return
      setCompact(y > 80 && y > dernier)
      dernier = y
    }
    window.addEventListener('scroll', suivre, { passive: true })
    return () => window.removeEventListener('scroll', suivre)
  }, [])
  return compact
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="absolute -top-1 left-1/2 ml-2 min-w-4 rounded-full bg-corail-600 px-1 text-center text-[10px] leading-4 font-semibold text-white" aria-label={`${n} favoris`}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

/** Mobile : capsule de verre bleu flottante, la sélection blanche glisse d'un onglet à l'autre. */
function BarreOnglets() {
  const actif = useOngletActif()
  const nbFavoris = useFavoris((s) => s.favoris.length)
  const compact = useCompactAuDefilement()
  const ref = useRef<HTMLDivElement>(null)
  const { cible, taille } = useCibleActive(ref, `${actif}-${compact}`)
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md print:hidden">
      <div ref={ref} className={`verre-bleu refraction relative grid grid-cols-4 rounded-full p-1.5 transition-[height] duration-300 ${compact ? 'h-13' : 'h-16'}`}>
        <LiquidSelector cible={cible} taille={taille} mode="horizontal" />
        {ONGLETS_APP.map(({ vers, libelle, icone: Icone }) => {
          const estActif = vers === actif
          return (
            <NavLink
              key={vers}
              to={vers}
              end={vers === '/'}
              data-actif={estActif}
              aria-label={compact ? libelle : undefined}
              className={`relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-full text-[11px] leading-tight font-semibold transition-colors ${estActif ? ENCRE_SELECTION : 'text-white/90 hover:text-white'}`}
            >
              <span className="relative">
                <Icone className={`size-5 ${estActif && vers === '/favoris' ? 'fill-current' : ''}`} aria-hidden />
                {vers === '/favoris' && <Badge n={nbFavoris} />}
              </span>
              {!compact && libelle}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function BoutonTheme({ className = '' }: { className?: string }) {
  const theme = usePreferences((p) => p.theme)
  const modifier = usePreferences((p) => p.modifier)
  const sombre = theme === 'sombre' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const Icone = sombre ? Sun : Moon
  return (
    <button type="button" onClick={() => modifier({ theme: sombre ? 'clair' : 'sombre' })} aria-label={sombre ? 'Passer en thème clair' : 'Passer en thème sombre'} title={`Thème : ${theme}`} className={className}>
      <Icone className="size-4.5" aria-hidden />
    </button>
  )
}

/** Ordinateur, barre repliée : capsule fine, icônes rondes, rond blanc sous l'onglet choisi. */
function BarreRepliee({ ouvrir }: { ouvrir: () => void }) {
  const actif = useOngletActif()
  const nbFavoris = useFavoris((s) => s.favoris.length)
  const ref = useRef<HTMLDivElement>(null)
  const { cible, taille } = useCibleActive(ref, actif)
  return (
    <nav aria-label="Navigation principale" className="fixed top-3 bottom-3 left-3 z-30 w-[4.5rem] print:hidden">
      <div className="verre-bleu refraction flex h-full flex-col items-center gap-2 rounded-[2.25rem] py-3">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Valise & Cap" className="size-12 rounded-full shadow-md ring-1 ring-white/30" />
        <div ref={ref} className="relative mt-3 flex flex-col items-center gap-2">
          <LiquidSelector cible={cible} taille={taille} mode="vertical" />
          {ONGLETS_APP.map(({ vers, libelle, icone: Icone }) => {
            const estActif = vers === actif
            return (
              <NavLink
                key={vers}
                to={vers}
                end={vers === '/'}
                data-actif={estActif}
                aria-label={libelle}
                title={libelle}
                className={`relative z-10 grid size-12 place-items-center rounded-full transition ${estActif ? ENCRE_SELECTION : 'bg-white/8 text-white/90 ring-1 ring-white/12 hover:bg-white/15'}`}
              >
                <Icone className={`size-5 ${estActif && vers === '/favoris' ? 'fill-current' : ''}`} aria-hidden />
                {vers === '/favoris' && <Badge n={nbFavoris} />}
              </NavLink>
            )
          })}
        </div>
        <span className="my-1 h-px w-6 bg-white/25" aria-hidden />
        <BoutonTheme className="grid size-10 place-items-center rounded-full bg-white/8 text-white/90 ring-1 ring-white/12 hover:bg-white/15" />
        <button type="button" onClick={ouvrir} aria-label="Ouvrir la barre latérale" title="Ouvrir la barre latérale" className="mt-auto grid size-10 place-items-center rounded-full bg-white/8 text-white/90 ring-1 ring-white/12 hover:bg-white/15">
          <PanelLeftOpen className="size-4.5" aria-hidden />
        </button>
      </div>
    </nav>
  )
}


const PASTILLES = ['bg-[#ff9f43]', 'bg-[#2fd08a]', 'bg-[#ff6b9a]', 'bg-[#6aa8ff]']

/** « Mes voyages récents » (la section « Projects » de la référence) : pastille de couleur et nombre de jours. */
function VoyagesRecents() {
  const sauvegardes = useVoyage((v) => v.sauvegardes)
  const ouvrir = useVoyage((v) => v.ouvrirSauvegarde)
  const navigate = useNavigate()
  const recents = [...sauvegardes].sort((a, b) => b.majLe.localeCompare(a.majLe)).slice(0, 3)
  if (recents.length === 0) return null
  return (
    <div className="mt-3 min-w-0">
      <p className="mb-1.5 pl-1 text-[10px] font-semibold tracking-[0.2em] text-white/55 uppercase">Voyages récents</p>
      <ul className="space-y-0.5">
        {recents.map((v, i) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => {
                ouvrir(v.id)
                navigate(v.statut === 'brouillon' ? '/configurer' : '/calcul?vers=voyage')
              }}
              className="flex h-9 w-full items-center gap-2 rounded-xl px-2 text-left text-[13px] text-white/90 hover:bg-white/10"
            >
              <span className={`size-2.5 shrink-0 rounded-full ${PASTILLES[i % PASTILLES.length]} shadow-[0_0_8px_currentColor]`} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{v.arrivee.nom}</span>
              <span className="shrink-0 rounded-md bg-white/10 px-1.5 text-[11px] tabular-nums text-white/75">{v.reglages.simple.nuits + 1} j</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Avatar et nom (onglet Compte) en bas de la barre ouverte. */
function Profil() {
  const utilisateur = useCompte((c) => c.utilisateur)
  const nom = utilisateur?.nom || 'Invité'
  const initiales = nom
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join('')
  return (
    <NavLink to="/compte" className="mt-auto flex items-center gap-2.5 rounded-2xl p-1.5 hover:bg-white/10">
      <span className="relative shrink-0">
        {utilisateur?.avatar ? (
          <img src={utilisateur.avatar} alt="" className="size-10 rounded-full object-cover ring-2 ring-white/30" />
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-[linear-gradient(135deg,#ffb36b,#ff7a3d)] text-sm font-bold text-white ring-2 ring-white/30">{initiales || 'V'}</span>
        )}
        <span className={`absolute right-0 bottom-0 size-3 rounded-full ring-2 ring-[#163a7c] ${utilisateur ? 'bg-[#2fd08a]' : 'bg-slate-400'}`} aria-hidden />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold">{nom}</span>
        <span className="block truncate text-[11px] text-white/65">{utilisateur?.email ?? 'Se connecter pour synchroniser'}</span>
      </span>
    </NavLink>
  )
}

/**
 * Ordinateur, barre ouverte (référence « Glassy Sidebar ») : pastilles de verre, et l'onglet
 * choisi devient une forme blanche qui coule dans le rail de droite, où son nom s'écrit à la verticale.
 */
function BarreOuverte({ fermer }: { fermer: () => void }) {
  const actif = useOngletActif()
  const nbFavoris = useFavoris((s) => s.favoris.length)
  const ref = useRef<HTMLDivElement>(null)
  const { cible, taille } = useCibleActive(ref, actif)
  const nomActif = ONGLETS_APP.find((o) => o.vers === actif)?.libelle ?? 'Valise & Cap'
  return (
    <nav aria-label="Navigation principale" className="fixed top-3 bottom-3 left-3 z-30 w-64 print:hidden">
      <div ref={ref} className="verre-bleu refraction relative h-full overflow-hidden rounded-[2.25rem]">
        <LiquidSelector cible={cible} taille={taille} mode="rail" rail={RAIL} rayon={18} />
        <div className="relative z-10 flex h-full flex-col gap-2 py-4 pl-3" style={{ paddingRight: RAIL + 12 }}>
          <div className="mb-3 flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-11 shrink-0 rounded-full shadow-md ring-1 ring-white/30" />
            <p className="min-w-0 leading-tight">
              <span className="block truncate font-bold">Valise & Cap</span>
              <span className="block truncate text-xs text-white/75">Budget de voyage</span>
            </p>
          </div>
          {ONGLETS_APP.map(({ vers, libelle, icone: Icone }) => {
            const estActif = vers === actif
            return (
              <NavLink
                key={vers}
                to={vers}
                end={vers === '/'}
                data-actif={estActif}
                className={`relative flex h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition ${estActif ? ENCRE_SELECTION : 'bg-white/8 text-white/90 shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] ring-1 ring-white/12 hover:bg-white/15'}`}
              >
                <Icone className={`size-5 shrink-0 ${estActif && vers === '/favoris' ? 'fill-current' : ''}`} aria-hidden />
                <span className="truncate">{libelle}</span>
                {vers === '/favoris' && nbFavoris > 0 && <span className="ml-auto rounded-full bg-corail-500 px-1.5 text-[11px] leading-5 text-white">{nbFavoris > 99 ? '99+' : nbFavoris}</span>}
              </NavLink>
            )
          })}
          <VoyagesRecents />
          <Profil />
        </div>
        {/* Rail blanc : boutons en haut, nom de la section à la verticale en bas */}
        <div className="absolute inset-y-0 right-0 z-10 flex flex-col items-center gap-2 py-4" style={{ width: RAIL }}>
          <button type="button" onClick={fermer} aria-label="Replier la barre latérale" title="Replier la barre latérale" className="grid size-10 place-items-center rounded-full bg-[#1c3e84] text-white shadow-md hover:bg-[#24519f]">
            <PanelLeftClose className="size-4.5" aria-hidden />
          </button>
          <BoutonTheme className={`grid size-10 place-items-center rounded-full ${ENCRE_SELECTION} ring-1 ring-[#0c2452]/15 hover:bg-[#0c2452]/5`} />
          <span className={`texte-vertical mt-auto text-[11px] font-semibold tracking-[0.3em] uppercase ${ENCRE_SELECTION} opacity-60`} aria-hidden>
            {nomActif}
          </span>
        </div>
      </div>
    </nav>
  )
}

/** Barre d'onglets : capsule en bas sur mobile, barre latérale sur ordinateur (repliée par défaut). */
export function Navigation({ large }: { large: boolean }) {
  const ouverte = usePreferences((p) => p.barreOuverte)
  const modifier = usePreferences((p) => p.modifier)
  if (!large) return <BarreOnglets />
  return ouverte ? <BarreOuverte fermer={() => modifier({ barreOuverte: false })} /> : <BarreRepliee ouvrir={() => modifier({ barreOuverte: true })} />
}
