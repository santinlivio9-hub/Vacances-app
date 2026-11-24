const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

export const formatEuros = (v: number) => euros.format(Math.round(v))

/** Arrondi lisible d'une borne de fourchette : 287 → 290, 1 243 → 1 240, 12 480 → 12 500 */
export const arrondiFourchette = (v: number) => {
  const pas = v < 100 ? 5 : v < 2000 ? 10 : 100
  return Math.round(v / pas) * pas
}

/** « entre 290 et 460 € » */
export const formatEntre = (f: { bas: number; haut: number }) => `entre ${nombre.format(arrondiFourchette(f.bas))} et ${formatEuros(arrondiFourchette(f.haut))}`

/** « 358 € (entre 290 et 460 €) » */
export const formatFourchette = (milieu: number, f: { bas: number; haut: number }) => `${formatEuros(milieu)} (${formatEntre(f)})`

export function formatKm(km: number): string {
  if (km < 10) return `${km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`
  const arrondi = km < 1000 ? Math.round(km / 5) * 5 : Math.round(km / 10) * 10
  return `${nombre.format(arrondi)} km`
}

/** 250 → « 4 h 10 » ; 45 → « 45 min » ; 1600 → « 1 j 2 h » */
export function formatDuree(minutes: number): string {
  const m = Math.max(1, Math.round(minutes / 5) * 5)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const reste = m % 60
  if (h >= 24) {
    const j = Math.floor(h / 24)
    const hr = h % 24
    return hr ? `${j} j ${hr} h` : `${j} j`
  }
  return reste ? `${h} h ${String(reste).padStart(2, '0')}` : `${h} h`
}
