import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { PageProvisoire } from './ui/PageProvisoire'

// Chaque écran est chargé à la demande : la carte (Leaflet) et les graphiques ne pèsent que là où ils servent.
const Carte = lazy(() => import('./pages/Carte'))
const Configurer = lazy(() => import('./pages/Configurer'))

export const ROUTES = {
  carte: '/',
  configurer: '/configurer',
  calcul: '/calcul',
  voyage: '/voyage',
  mesVoyages: '/mes-voyages',
} as const

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<div className="grid min-h-dvh place-items-center text-slate-500">Chargement…</div>}>
        <Routes>
          <Route path={ROUTES.carte} element={<Carte />} />
          <Route path={ROUTES.configurer} element={<Configurer />} />
          <Route path={ROUTES.calcul} element={<PageProvisoire titre="Calcul du voyage" phase={5} />} />
          <Route path={ROUTES.voyage} element={<PageProvisoire titre="Mon voyage" phase={5} />} />
          <Route path={ROUTES.mesVoyages} element={<PageProvisoire titre="Mes voyages" phase={5} />} />
          <Route path="*" element={<Navigate to={ROUTES.carte} replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
