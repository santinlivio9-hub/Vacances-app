import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { Circle, MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet'
import type { Lieu } from '../domain/types'
import type { ZoneLogement } from '../engine/sejourLong'
import { ATTRIBUTION_CARTE } from '../carte/FondCarte'
import { formatEuros } from '../ui/format'

export const COULEURS_ZONES: Record<ZoneLogement['id'], string> = { proche: '#0ca30c', moyenne: '#1585ae', eloignee: '#8a63d2' }

const travail = L.divIcon({ className: '', html: '<div style="--c:#c23f29" class="epingle"><span>T</span></div>', iconSize: [36, 44], iconAnchor: [18, 42] })

/** Zones de logement autour du lieu de travail : un anneau par temps de trajet. */
export default function CarteZones({ arrivee, zones, choisie }: { arrivee: Lieu; zones: ZoneLogement[]; choisie: ZoneLogement['id'] }) {
  const rayonMax = Math.max(...zones.map((z) => z.rayonMaxKm))
  const limites = useMemo(() => {
    const d = rayonMax / 111
    const dl = d / Math.cos((arrivee.lat * Math.PI) / 180)
    return L.latLngBounds([arrivee.lat - d, arrivee.lon - dl], [arrivee.lat + d, arrivee.lon + dl])
  }, [arrivee, rayonMax])
  return (
    <div>
      <div className="h-[55dvh] min-h-80 overflow-hidden rounded-3xl ring-1 ring-slate-900/10 dark:ring-white/10">
        <MapContainer bounds={limites} boundsOptions={{ padding: [16, 16] }} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={ATTRIBUTION_CARTE} maxZoom={19} className="fond-adouci" />
          {[...zones].reverse().map((z) => (
            <Circle
              key={z.id}
              center={[arrivee.lat, arrivee.lon]}
              radius={z.rayonMaxKm * 1000}
              pathOptions={{ color: COULEURS_ZONES[z.id], weight: z.id === choisie ? 3 : 1.5, fillOpacity: z.id === choisie ? 0.16 : 0.07, dashArray: z.id === choisie ? undefined : '5 6' }}
            >
              <Tooltip sticky>
                <strong>{z.nom}</strong> : ≤ {z.minutes} min
                <br />
                Trajet : {z.coutTrajetMois ? `${formatEuros(z.coutTrajetMois)} / mois` : 'gratuit'}
              </Tooltip>
            </Circle>
          ))}
          <Marker position={[arrivee.lat, arrivee.lon]} icon={travail} alt="Lieu de travail">
            <Tooltip direction="top" offset={[0, -36]}>
              Lieu de travail : {arrivee.nom}
            </Tooltip>
          </Marker>
        </MapContainer>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm" aria-label="Légende des zones">
        {zones.map((z) => (
          <li key={z.id} className="flex items-start gap-2">
            <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: COULEURS_ZONES[z.id] }} aria-hidden />
            <span>
              <strong>{z.nom}</strong> (jusqu’à {z.rayonMaxKm.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km) : {z.description}
              {z.id === choisie && <span className="ml-1 rounded-full bg-ocean-100 px-2 py-0.5 text-xs font-semibold text-ocean-800 dark:bg-ocean-800 dark:text-ocean-100">zone choisie</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
