import { lazy, Suspense } from "react";
import { MotionConfig } from "framer-motion";
import { HashRouter, Navigate, Route, Routes } from "react-router";

// Chaque écran est chargé à la demande : la carte (Leaflet) et les graphiques ne pèsent que là où ils servent.
const Carte = lazy(() => import("./pages/Carte"));
const Configurer = lazy(() => import("./pages/Configurer"));
const Calcul = lazy(() => import("./pages/Calcul"));
const Voyage = lazy(() => import("./pages/Voyage"));
const MesVoyages = lazy(() => import("./pages/MesVoyages"));
const Partage = lazy(() => import("./pages/Partage"));

export const ROUTES = {
  carte: "/",
  configurer: "/configurer",
  calcul: "/calcul",
  voyage: "/voyage",
  mesVoyages: "/mes-voyages",
} as const;

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Suspense
          fallback={
            <div className="grid min-h-dvh place-items-center text-slate-500">
              Chargement…
            </div>
          }
        >
          <Routes>
            <Route path={ROUTES.carte} element={<Carte />} />
            <Route path={ROUTES.configurer} element={<Configurer />} />
            <Route path={ROUTES.calcul} element={<Calcul />} />
            <Route path={ROUTES.voyage} element={<Voyage />} />
            <Route path={ROUTES.mesVoyages} element={<MesVoyages />} />
            <Route path="/partage" element={<Partage />} />
            <Route path="*" element={<Navigate to={ROUTES.carte} replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </MotionConfig>
  );
}
