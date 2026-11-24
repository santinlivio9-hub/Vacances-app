import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet'
import type { Itineraire, Lieu } from '../domain/types'
import { ATTRIBUTION_CARTE } from '../carte/FondCarte'
import { COULEURS_JOURS } from './libelles'

const numero = (n: number, couleur: string) =>
  L.divIcon({
    className: '',
    html: `<span style="background:${couleur}" class="numero-carte">${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

/** Carte du séjour : un numéro par activité, une couleur et un tracé par jour. */
export default function OngletCarte({ itineraire, arrivee }: { itineraire: Itineraire; arrivee: Lieu }) {
  const jours = useMemo(() => {
    let n = 0
    return itineraire.jours
      .filter((j) => j.activites.length > 0)
      .map((j) => ({ jour: j, couleur: COULEURS_JOURS[j.index % COULEURS_JOURS.length], points: j.activites.map((a) => ({ a, n: ++n })) }))
  }, [itineraire])
  const limites = useMemo(() => {
    const pts = jours.flatMap((j) => j.points.map(({ a }) => [a.lieu.lat, a.lieu.lon] as [number, number]))
    return pts.length ? L.latLngBounds([...pts, [arrivee.lat, arrivee.lon]]) : L.latLngBounds([[arrivee.lat - 0.05, arrivee.lon - 0.05], [arrivee.lat + 0.05, arrivee.lon + 0.05]])
  }, [jours, arrivee])

  return (
    <div>
      <div className="h-[60dvh] min-h-80 overflow-hidden rounded-3xl ring-1 ring-slate-900/10 dark:ring-white/10">
        <MapContainer bounds={limites} boundsOptions={{ padding: [32, 32], maxZoom: 15 }} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={ATTRIBUTION_CARTE} maxZoom={19} className="fond-adouci" />
          {jours.map(({ jour, couleur, points }) => (
            <Polyline key={jour.index} positions={points.map(({ a }) => [a.lieu.lat, a.lieu.lon] as [number, number])} pathOptions={{ color: couleur, weight: 3, opacity: 0.8, dashArray: '6 8' }} />
          ))}
          {jours.flatMap(({ jour, couleur, points }) =>
            points.map(({ a, n }) => (
              <Marker key={a.lieu.id} position={[a.lieu.lat, a.lieu.lon]} icon={numero(n, couleur)} alt={`${n}. ${a.lieu.nom}`}>
                <Tooltip direction="top" offset={[0, -12]}>
                  <strong>
                    {n}. {a.lieu.nom}
                  </strong>
                  <br />
                  Jour {jour.index + 1}, {a.heure}
                </Tooltip>
              </Marker>
            )),
          )}
        </MapContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm" aria-label="Légende">
        {jours.map(({ jour, couleur, points }) => (
          <li key={jour.index} className="flex items-center gap-1.5">
            <span className="size-3 rounded-full" style={{ background: couleur }} aria-hidden />
            Jour {jour.index + 1} <span className="text-slate-500 dark:text-slate-400">({points.map((p) => p.n).join(', ')})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
