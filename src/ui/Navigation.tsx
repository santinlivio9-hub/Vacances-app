import { Compass, Heart, Luggage, UserRound } from 'lucide-react'
import { NavLink } from 'react-router'
import { useFavoris } from '../store/favoris'

export const ONGLETS_APP = [
  { vers: '/', libelle: 'Explorer', icone: Compass },
  { vers: '/mes-voyages', libelle: 'Mes voyages', icone: Luggage },
  { vers: '/favoris', libelle: 'Favoris', icone: Heart },
  { vers: '/compte', libelle: 'Compte', icone: UserRound },
] as const

/** Barre d'onglets : en bas sur mobile, barre latérale sur ordinateur. */
export function Navigation({ large }: { large: boolean }) {
  const nbFavoris = useFavoris((s) => s.favoris.length)
  return (
    <nav
      aria-label="Navigation principale"
      className={`verre fixed z-30 print:hidden ${
        large
          ? 'inset-y-0 left-0 flex w-(--nav-gauche) flex-col items-stretch gap-1 rounded-none border-y-0 border-l-0 px-2 pt-5 [--verre-fond:0.85]'
          : 'inset-x-0 bottom-0 grid h-(--nav-bas) grid-cols-4 rounded-none border-x-0 border-b-0 px-1 pb-[env(safe-area-inset-bottom)] [--verre-fond:0.92]'
      }`}
    >
      {large && (
        <div className="mb-4 flex flex-col items-center gap-1">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-9 rounded-xl shadow-sm" />
          <p className="text-center text-[11px] leading-tight font-bold tracking-tight text-ocean-800 dark:text-ocean-200">
            Valise
            <br />& Cap
          </p>
        </div>
      )}
      {ONGLETS_APP.map(({ vers, libelle, icone: Icone }) => (
        <NavLink
          key={vers}
          to={vers}
          end={vers === '/'}
          className={({ isActive }) =>
            `group relative flex flex-col items-center justify-center gap-0.5 rounded-2xl text-center text-[11px] leading-tight font-semibold transition ${large ? 'h-16' : 'h-full'} ${
              isActive ? 'text-ocean-800 dark:text-white' : 'text-slate-500 hover:text-ocean-700 dark:text-slate-400 dark:hover:text-ocean-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`grid h-8 w-14 place-items-center rounded-full transition ${isActive ? 'bg-ocean-100 dark:bg-ocean-800' : 'group-hover:bg-slate-900/5 dark:group-hover:bg-white/10'}`}>
                <Icone className={`size-5 ${isActive && vers === '/favoris' ? 'fill-current' : ''}`} aria-hidden />
              </span>
              {libelle}
              {vers === '/favoris' && nbFavoris > 0 && (
                <span className="absolute top-1 left-1/2 ml-2 min-w-4 rounded-full bg-corail-600 px-1 text-center text-[10px] leading-4 text-white" aria-label={`${nbFavoris} favoris`}>
                  {nbFavoris > 99 ? '99+' : nbFavoris}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
