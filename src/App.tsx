import { lazy, Suspense, useEffect, type CSSProperties } from 'react'
import { MotionConfig } from 'framer-motion'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { useLarge } from './carte/hooks'
import { Navigation } from './ui/Navigation'
import { useTheme } from './ui/theme'

// Chaque écran est chargé à la demande : la carte (Leaflet) et les graphiques ne pèsent que là où ils servent.
const Carte = lazy(() => import('./pages/Carte'))
const Configurer = lazy(() => import('./pages/Configurer'))
const Calcul = lazy(() => import('./pages/Calcul'))
const Propositions = lazy(() => import('./pages/Propositions'))
const Voyage = lazy(() => import('./pages/Voyage'))
const MesVoyages = lazy(() => import('./pages/MesVoyages'))
const Favoris = lazy(() => import('./pages/Favoris'))
const Compte = lazy(() => import('./pages/Compte'))
const Partage = lazy(() => import('./pages/Partage'))

export const ROUTES = {
  carte: '/',
  configurer: '/configurer',
  calcul: '/calcul',
  propositions: '/propositions',
  voyage: '/voyage',
  mesVoyages: '/mes-voyages',
  favoris: '/favoris',
  compte: '/compte',
} as const

/** Écrans sans barre d'onglets : on y garde la place pour « Calculer mon voyage ». */
const SANS_NAVIGATION = [ROUTES.configurer, ROUTES.calcul, '/partage']

const chargement = <div className="grid min-h-dvh place-items-center text-slate-500">Chargement…</div>

/** Mise en page commune : barre d'onglets (en bas ou à gauche) et place réservée pour elle. */
function Coque() {
  const { pathname } = useLocation()
  const large = useLarge()
  const visible = !SANS_NAVIGATION.includes(pathname)
  // Chaque écran s'ouvre en haut de page (sinon on garde le défilement de l'écran précédent)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const style = {
    '--nav-bas': visible && !large ? 'calc(4rem + env(safe-area-inset-bottom))' : '0px',
    '--nav-gauche': visible && large ? '5.5rem' : '0px',
  } as CSSProperties
  return (
    <div style={style} className="pb-(--nav-bas) pl-(--nav-gauche) print:p-0">
      <Suspense fallback={chargement}>
        <Outlet />
      </Suspense>
      {visible && <Navigation large={large} />}
    </div>
  )
}

export default function App() {
  useTheme()
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Routes>
          <Route element={<Coque />}>
            <Route path={ROUTES.carte} element={<Carte />} />
            <Route path={ROUTES.configurer} element={<Configurer />} />
            <Route path={ROUTES.calcul} element={<Calcul />} />
            <Route path={ROUTES.propositions} element={<Propositions />} />
            <Route path={ROUTES.voyage} element={<Voyage />} />
            <Route path={ROUTES.mesVoyages} element={<MesVoyages />} />
            <Route path={ROUTES.favoris} element={<Favoris />} />
            <Route path={ROUTES.compte} element={<Compte />} />
            <Route path="/partage" element={<Partage />} />
            <Route path="*" element={<Navigate to={ROUTES.carte} replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </MotionConfig>
  )
}
