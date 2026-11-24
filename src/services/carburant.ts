import { create } from 'zustand'
import { CARBURANT_REPLI, definirCarburant, type PrixCarburant } from '../engine/carburant'

const URL_API =
  'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?select=' +
  encodeURIComponent('avg(gazole_prix) as gazole, avg(sp95_prix) as sp95, avg(e10_prix) as e10, max(gazole_maj) as maj') +
  '&limit=1'

/** Prix du carburant du jour, partagé par toute l'app (le calcul se refait quand il arrive). */
export const useCarburant = create<{ valeur: PrixCarburant }>(() => ({ valeur: CARBURANT_REPLI }))

let dejaDemande = false

/** Lit la moyenne nationale du jour une fois par session ; garde la valeur datée en cas d'échec. */
export async function chargerPrixCarburant(): Promise<void> {
  if (dejaDemande) return
  dejaDemande = true
  try {
    const r = await fetch(URL_API, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return
    const ligne = (await r.json())?.results?.[0] as { gazole?: number; sp95?: number; e10?: number; maj?: string } | undefined
    const ok = (v: unknown): v is number => typeof v === 'number' && v > 0.8 && v < 4
    if (!ligne || !ok(ligne.gazole) || !ok(ligne.e10) || !ok(ligne.sp95)) return
    const date = typeof ligne.maj === 'string' ? ligne.maj.slice(0, 10) : new Date().toISOString().slice(0, 10)
    useCarburant.setState({ valeur: definirCarburant({ gazole: ligne.gazole, sp95: ligne.sp95, e10: ligne.e10, date, source: 'direct' }) })
  } catch {
    /* hors ligne ou API indisponible : on garde la valeur datée */
  }
}
