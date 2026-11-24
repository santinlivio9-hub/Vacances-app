import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CleAvancee, Lieu, ModeTransport, Reglages, ReglagesAvances, ReglagesSimples } from '../domain/types'
import { reglagesSimplesParDefaut } from '../engine/reglages'
import { stockageSur } from './stockageSur'

export interface VoyageSauvegarde {
  id: string
  nom: string
  creeLe: string
  depart: Lieu
  arrivee: Lieu
  reglages: Reglages
  graine: number
}

interface EtatVoyage {
  depart: Lieu | null
  arrivee: Lieu | null
  reglages: Reglages
  /** Interrupteur Simple / Avancé, mémorisé */
  modeAvance: boolean
  /** Graine de l'itinéraire : « Régénérer » la change */
  graine: number
  sauvegardes: VoyageSauvegarde[]
  /** Trajet (« lat,lon→lat,lon ») pour lequel on a déjà proposé le mode conseillé */
  trajetConseille: string | null

  definirDepart: (lieu: Lieu | null) => void
  definirArrivee: (lieu: Lieu | null) => void
  inverser: () => void
  modifierSimple: (partiel: Partial<ReglagesSimples>) => void
  modifierAvance: <K extends CleAvancee>(cle: K, valeur: ReglagesAvances[K]) => void
  /** Revient à la valeur par défaut (déduite du mode Simple) */
  reinitialiserAvance: (cle: CleAvancee) => void
  reinitialiserTousLesAvances: () => void
  basculerModeAvance: () => void
  /** Propose le mode de transport conseillé, une seule fois par trajet (ne réécrase pas un choix ultérieur) */
  appliquerModeConseille: (mode: ModeTransport) => void
  regenerer: () => void
  sauvegarder: (nom: string) => VoyageSauvegarde | null
  supprimerSauvegarde: (id: string) => void
  ouvrirSauvegarde: (id: string) => void
}

export function dateDuJour(maintenant = new Date()): string {
  const d2 = (n: number) => String(n).padStart(2, '0')
  return `${maintenant.getFullYear()}-${d2(maintenant.getMonth() + 1)}-${d2(maintenant.getDate())}`
}

export const etatInitial = () => ({
  depart: null,
  arrivee: null,
  reglages: { simple: reglagesSimplesParDefaut(dateDuJour()), modifies: {} },
  modeAvance: false,
  graine: 1,
  sauvegardes: [] as VoyageSauvegarde[],
  trajetConseille: null as string | null,
})

export const cleTrajet = (depart: Lieu, arrivee: Lieu) =>
  `${depart.lat.toFixed(4)},${depart.lon.toFixed(4)}→${arrivee.lat.toFixed(4)},${arrivee.lon.toFixed(4)}`

export const useVoyage = create<EtatVoyage>()(
  persist(
    (set, get) => ({
      ...etatInitial(),

      definirDepart: (depart) => set({ depart }),
      definirArrivee: (arrivee) => set({ arrivee }),
      inverser: () => set(({ depart, arrivee }) => ({ depart: arrivee, arrivee: depart })),

      modifierSimple: (partiel) => set(({ reglages }) => ({ reglages: { ...reglages, simple: { ...reglages.simple, ...partiel } } })),
      modifierAvance: (cle, valeur) =>
        set(({ reglages }) => ({ reglages: { ...reglages, modifies: { ...reglages.modifies, [cle]: valeur } } })),
      reinitialiserAvance: (cle) =>
        set(({ reglages }) => {
          const modifies = { ...reglages.modifies }
          delete modifies[cle]
          return { reglages: { ...reglages, modifies } }
        }),
      reinitialiserTousLesAvances: () => set(({ reglages }) => ({ reglages: { ...reglages, modifies: {} } })),
      basculerModeAvance: () => set(({ modeAvance }) => ({ modeAvance: !modeAvance })),
      appliquerModeConseille: (mode) => {
        const { depart, arrivee, trajetConseille, reglages } = get()
        if (!depart || !arrivee) return
        const cle = cleTrajet(depart, arrivee)
        if (cle === trajetConseille) return
        set({ trajetConseille: cle, reglages: { ...reglages, simple: { ...reglages.simple, transport: mode } } })
      },
      regenerer: () => set(({ graine }) => ({ graine: graine + 1 })),

      sauvegarder: (nom) => {
        const { depart, arrivee, reglages, graine, sauvegardes } = get()
        if (!depart || !arrivee) return null
        const voyage: VoyageSauvegarde = {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          nom,
          creeLe: new Date().toISOString(),
          depart,
          arrivee,
          reglages,
          graine,
        }
        set({ sauvegardes: [voyage, ...sauvegardes].slice(0, 30) })
        return voyage
      },
      supprimerSauvegarde: (id) => set(({ sauvegardes }) => ({ sauvegardes: sauvegardes.filter((v) => v.id !== id) })),
      ouvrirSauvegarde: (id) => {
        const v = get().sauvegardes.find((s) => s.id === id)
        if (v) set({ depart: v.depart, arrivee: v.arrivee, reglages: v.reglages, graine: v.graine })
      },
    }),
    {
      name: 'budget-voyage:v2',
      version: 1,
      storage: createJSONStorage(() => stockageSur),
      partialize: ({ depart, arrivee, reglages, modeAvance, graine, sauvegardes, trajetConseille }) => ({
        trajetConseille,
        depart,
        arrivee,
        reglages,
        modeAvance,
        graine,
        sauvegardes,
      }),
    },
  ),
)
