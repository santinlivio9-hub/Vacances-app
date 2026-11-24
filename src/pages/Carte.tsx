import { ArrowUpDown, Bookmark, ChevronDown, LocateFixed, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChampLieu } from '../carte/ChampLieu'
import { DestinationsPopulaires } from '../carte/DestinationsPopulaires'
import { useItineraire, useLarge, useResume } from '../carte/hooks'
import { MenuPoint } from '../carte/MenuPoint'
import { PanneauTrajet } from '../carte/PanneauTrajet'
import type { Coordonnees, Lieu } from '../domain/types'
import { maPosition, MESSAGES_POSITION, type ErreurPosition } from '../services/geolocalisation'
import { adresseDuPoint, coordonneesEnTexte } from '../services/nominatim'
import { useVoyage } from '../store/voyage'
import { MentionDonnees } from '../ui/MentionDonnees'

const FondCarte = lazy(() => import('../carte/FondCarte'))

/** Adresse d'un point, ou ses coordonnées si Nominatim ne répond pas. */
async function lieuDuPoint(p: Coordonnees): Promise<Lieu> {
  try {
    return await adresseDuPoint(p)
  } catch {
    return { nom: coordonneesEnTexte(p), detail: '', lat: p.lat, lon: p.lon }
  }
}

function Pastille({ lettre, couleur }: { lettre: string; couleur: string }) {
  return (
    <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${couleur}`}>
      {lettre}
    </span>
  )
}

export default function Carte() {
  const navigate = useNavigate()
  const large = useLarge()
  const { depart, arrivee, reglages, definirDepart, definirArrivee, inverser, appliquerModeConseille } = useVoyage()
  const etatItineraire = useItineraire(depart, arrivee)
  const itineraire = etatItineraire.statut === 'ok' ? etatItineraire.valeur : null
  const resume = useResume(arrivee)

  const [point, setPoint] = useState<{ coord: Coordonnees; lieu: Lieu | null } | null>(null)
  const [localisation, setLocalisation] = useState(false)
  const [messagePosition, setMessagePosition] = useState<string | null>(null)
  const [replie, setReplie] = useState(false)

  // Hauteurs réelles des panneaux, pour cadrer le trajet dans la partie visible de la carte
  const refHaut = useRef<HTMLDivElement>(null)
  const refBas = useRef<HTMLDivElement>(null)
  const [marges, setMarges] = useState({ haut: 0, bas: 0, gauche: 0 })
  useEffect(() => {
    const mesurer = () =>
      setMarges(
        large
          ? { haut: 0, bas: 0, gauche: (refHaut.current?.parentElement?.offsetWidth ?? 0) + 16 }
          : { haut: refHaut.current?.offsetHeight ?? 0, bas: refBas.current?.offsetHeight ?? 0, gauche: 0 },
      )
    mesurer()
    const obs = new ResizeObserver(mesurer)
    if (refHaut.current) obs.observe(refHaut.current)
    if (refBas.current) obs.observe(refBas.current)
    return () => obs.disconnect()
  }, [large])

  const surPoint = useCallback(async (coord: Coordonnees) => {
    setPoint({ coord, lieu: null })
    setReplie(false)
    const lieu = await lieuDuPoint(coord)
    setPoint((p) => (p && p.coord === coord ? { coord, lieu } : p))
  }, [])

  const surDeplacer = useCallback(
    async (role: 'depart' | 'arrivee', coord: Coordonnees) => {
      const lieu = await lieuDuPoint(coord)
      if (role === 'depart') definirDepart(lieu)
      else definirArrivee(lieu)
    },
    [definirDepart, definirArrivee],
  )

  async function utiliserMaPosition() {
    setLocalisation(true)
    setMessagePosition(null)
    try {
      const coord = await maPosition()
      definirDepart({ ...(await lieuDuPoint(coord)), nom: 'Ma position' })
    } catch (e) {
      setMessagePosition(MESSAGES_POSITION[e as ErreurPosition] ?? MESSAGES_POSITION.indisponible)
    } finally {
      setLocalisation(false)
    }
  }

  function configurer() {
    if (itineraire) appliquerModeConseille(itineraire.mode)
    navigate('/configurer')
  }

  const boutonPosition = (
    <button
      type="button"
      onClick={utiliserMaPosition}
      disabled={localisation}
      className="grid size-10 shrink-0 place-items-center rounded-full text-ocean-700 hover:bg-ocean-100 disabled:opacity-60 dark:text-ocean-300 dark:hover:bg-white/10"
      aria-label="Utiliser ma position comme départ"
      title="Ma position"
    >
      {localisation ? <Loader2 className="size-5 animate-spin" /> : <LocateFixed className="size-5" />}
    </button>
  )

  const contenuBas = point ? (
    <MenuPoint
      lieu={point.lieu}
      onFermer={() => setPoint(null)}
      onDepart={() => {
        if (point.lieu) definirDepart(point.lieu)
        setPoint(null)
      }}
      onArrivee={() => {
        if (point.lieu) definirArrivee(point.lieu)
        setPoint(null)
      }}
    />
  ) : arrivee ? (
    <div className="px-4 pt-4 pb-2">
      <PanneauTrajet
        depart={depart}
        arrivee={arrivee}
        itineraire={itineraire}
        resume={resume}
        nuits={reglages.simple.nuits}
        dateDepart={reglages.simple.dateDepart}
        onConfigurer={configurer}
        onMaPosition={utiliserMaPosition}
      />
    </div>
  ) : (
    <div className="py-4">
      <DestinationsPopulaires onChoisir={definirArrivee} />
      <p className="mt-2 px-4 text-xs text-slate-500 dark:text-slate-400">Astuce : touchez la carte (ou faites un clic droit) pour choisir un point précis.</p>
    </div>
  )

  return (
    <main className="fixed inset-0 overflow-hidden">
      <h1 className="sr-only">Budget Voyage : choisissez votre trajet sur la carte</h1>
      <Suspense fallback={<div className="absolute inset-0 bg-[#e8eef2] dark:bg-[#1b2530]" />}>
        <FondCarte
          depart={depart}
          arrivee={arrivee}
          itineraire={itineraire}
          pointChoisi={point?.coord ?? null}
          onPoint={surPoint}
          onDeplacer={surDeplacer}
          marges={marges}
        />
      </Suspense>

      {/* Colonne de gauche sur ordinateur ; haut et bas de l'écran sur mobile */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4 lg:inset-y-0 lg:right-auto lg:w-[26rem] lg:justify-start lg:gap-3">
        <div ref={refHaut} className="verre pointer-events-auto rounded-3xl p-3 [--verre-fond:0.82]">
          <div className="mb-2 flex items-center justify-between pl-1">
            <p className="text-sm font-bold tracking-tight text-ocean-800 dark:text-ocean-200">Budget Voyage</p>
            <Link to="/mes-voyages" className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ocean-800 hover:bg-ocean-100/80 dark:text-ocean-200 dark:hover:bg-white/10">
              <Bookmark className="size-4" aria-hidden />
              Mes voyages
            </Link>
          </div>
          <div className="relative space-y-2">
            <ChampLieu
              libelle="Départ"
              placeholder="Point de départ"
              valeur={depart}
              onChoisir={definirDepart}
              proximite={arrivee ?? undefined}
              pastille={<Pastille lettre="A" couleur="bg-ocean-700" />}
              action={boutonPosition}
            />
            <ChampLieu
              libelle="Arrivée"
              placeholder="Où allez-vous ?"
              valeur={arrivee}
              onChoisir={definirArrivee}
              proximite={depart ?? undefined}
              pastille={<Pastille lettre="B" couleur="bg-corail-700" />}
            />
            {(depart || arrivee) && (
              <button
                type="button"
                onClick={inverser}
                className="absolute top-1/2 right-14 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-600 shadow ring-1 ring-slate-900/10 hover:text-ocean-700 dark:bg-slate-800 dark:text-slate-300 dark:ring-white/10"
                aria-label="Inverser départ et arrivée"
                title="Inverser"
              >
                <ArrowUpDown className="size-4" />
              </button>
            )}
          </div>
          {messagePosition && (
            <p role="status" className="mt-2 rounded-xl bg-corail-300/30 px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
              {messagePosition}
            </p>
          )}
        </div>

        <motion.div
          ref={refBas}
          layout
          className="verre pointer-events-auto max-h-[58dvh] overflow-hidden rounded-3xl [--verre-fond:0.9] lg:max-h-none lg:min-h-0 lg:shrink"
        >
          <div className="flex max-h-[inherit] flex-col lg:max-h-[calc(100dvh-14rem)]">
            {!large && (
              <button
                type="button"
                onClick={() => setReplie((r) => !r)}
                className="flex h-7 w-full shrink-0 items-center justify-center"
                aria-expanded={!replie}
                aria-label={replie ? 'Déplier le panneau' : 'Replier le panneau'}
              >
                {replie ? <ChevronDown className="size-5 rotate-180 text-slate-500" /> : <span className="h-1.5 w-10 rounded-full bg-slate-400/60" />}
              </button>
            )}
            <AnimatePresence initial={false} mode="wait">
              {!(replie && !large) && (
                <motion.div
                  key={point ? 'point' : arrivee ? `trajet-${arrivee.lat}` : 'populaires'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="min-h-0 overflow-y-auto overscroll-contain"
                >
                  {contenuBas}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="shrink-0 border-t border-slate-900/5 px-4 py-1.5 text-[11px] leading-snug text-slate-500 dark:border-white/10 dark:text-slate-400">
              <MentionDonnees className="inline !text-[11px]" /> Fond de carte © OpenStreetMap.
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
