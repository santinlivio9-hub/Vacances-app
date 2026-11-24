import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import type { Coordonnees, Lieu } from '../domain/types'
import { useLarge, useSombre } from './hooks'
import type { ItineraireCarte } from './itineraire'

/**
 * Fond OpenStreetMap standard : gratuit et sans clé (CARTO exige une clé depuis septembre 2026).
 * Règles d'usage : attribution visible, usage modéré, pas de téléchargement en masse.
 * https://operations.osmfoundation.org/policies/tiles/
 * Un filtre CSS (classe .fond-adouci) atténue les couleurs pour laisser ressortir le trajet.
 */
const TUILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const ATTRIBUTION_CARTE = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function epingle(lettre: string, couleur: string) {
  return L.divIcon({
    className: '',
    html: `<div style="--c:${couleur}" class="epingle"><span>${lettre}</span></div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
  })
}
const ICONES = { depart: epingle('A', '#0b6b92'), arrivee: epingle('B', '#e5533a'), point: epingle('', '#475569') }

interface Props {
  depart: Lieu | null
  arrivee: Lieu | null
  itineraire: ItineraireCarte | null
  pointChoisi: Coordonnees | null
  onPoint: (p: Coordonnees) => void
  onDeplacer: (role: 'depart' | 'arrivee', p: Coordonnees) => void
  /** Marges à laisser libres pour cadrer le trajet (panneaux posés sur la carte) */
  marges: { haut: number; bas: number; gauche: number }
}

function Evenements({ onPoint }: { onPoint: Props['onPoint'] }) {
  useMapEvents({
    click: (e) => onPoint({ lat: e.latlng.lat, lon: L.Util.wrapNum(e.latlng.lng, [-180, 180], true) }),
    // clic droit sur ordinateur, appui long sur mobile
    contextmenu: (e) => onPoint({ lat: e.latlng.lat, lon: L.Util.wrapNum(e.latlng.lng, [-180, 180], true) }),
  })
  return null
}

/** Recadre la carte quand le trajet change. */
function Cadrage({ points, marges }: { points: [number, number][]; marges: Props['marges'] }) {
  const carte = useMap()
  const cle = points.map((p) => p.join(',')).join(';')
  useEffect(() => {
    if (points.length === 0) return
    const options = {
      paddingTopLeft: L.point(marges.gauche + 32, marges.haut + 32),
      paddingBottomRight: L.point(32, marges.bas + 32),
      maxZoom: 12,
      animate: true,
    }
    if (points.length === 1) carte.flyTo(points[0], Math.max(carte.getZoom(), 10), { duration: 0.8 })
    else carte.flyToBounds(L.latLngBounds(points), { ...options, duration: 0.9 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, carte])
  return null
}

export default function FondCarte({ depart, arrivee, itineraire, pointChoisi, onPoint, onDeplacer, marges }: Props) {
  const sombre = useSombre()
  const large = useLarge()
  const refCarte = useRef<L.Map | null>(null)

  const pointsCadrage = useMemo(() => {
    if (itineraire && itineraire.trace.length > 1) return itineraire.trace
    return [depart, arrivee].filter((l): l is Lieu => !!l).map((l) => [l.lat, l.lon] as [number, number])
  }, [itineraire, depart, arrivee])

  const evenementsMarqueur = (role: 'depart' | 'arrivee') => ({
    dragend: (e: L.DragEndEvent) => {
      const { lat, lng } = (e.target as L.Marker).getLatLng()
      onDeplacer(role, { lat, lon: lng })
    },
  })

  return (
    <MapContainer
      ref={refCarte}
      center={[46.6, 2.4]}
      zoom={large ? 6 : 5}
      minZoom={2}
      worldCopyJump
      zoomControl={false}
      className="absolute inset-0 z-0 h-full w-full bg-[#e8eef2] dark:bg-[#1b2530]"
      attributionControl={false}
    >
      <TileLayer url={TUILES} attribution={ATTRIBUTION_CARTE} maxZoom={19} className="fond-adouci" />
      {large && <ZoomControl position="bottomright" />}
      <Evenements onPoint={onPoint} />
      <Cadrage points={pointsCadrage} marges={marges} />

      {itineraire && itineraire.trace.length > 1 && (
        <>
          {/* liseré blanc pour la lisibilité sur tous les fonds */}
          <Polyline positions={itineraire.trace} pathOptions={{ color: sombre ? '#0a2535' : '#ffffff', weight: itineraire.genre === 'route' ? 8 : 6, opacity: itineraire.genre === 'route' ? 0.9 : 0.5, lineCap: 'round' }} />
          <Polyline
            positions={itineraire.trace}
            pathOptions={{
              color: itineraire.genre === 'vol' ? '#e5533a' : '#0b6b92',
              weight: 4,
              opacity: 0.95,
              dashArray: itineraire.genre === 'route' ? undefined : '10 10',
              lineCap: 'round',
            }}
          />
        </>
      )}

      {depart && <Marker position={[depart.lat, depart.lon]} icon={ICONES.depart} draggable eventHandlers={evenementsMarqueur('depart')} title={`Départ : ${depart.nom}`} alt={`Départ : ${depart.nom}`} />}
      {arrivee && <Marker position={[arrivee.lat, arrivee.lon]} icon={ICONES.arrivee} draggable eventHandlers={evenementsMarqueur('arrivee')} title={`Arrivée : ${arrivee.nom}`} alt={`Arrivée : ${arrivee.nom}`} />}
      {pointChoisi && <Marker position={[pointChoisi.lat, pointChoisi.lon]} icon={ICONES.point} interactive={false} />}
    </MapContainer>
  )
}
