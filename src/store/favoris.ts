import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Coordonnees, Lieu, Reglages } from '../domain/types'
import { stockageSur } from './stockageSur'

export type TypeFavori = 'destination' | 'activite' | 'logement' | 'proposition'

export interface Favori {
  /** Identifiant stable : « destination:45.89920,6.12940 », « activite:osm-node-123 »… */
  id: string
  type: TypeFavori
  nom: string
  detail: string
  image?: string
  /** Lieu à ouvrir sur la carte (destination) ou à situer (activité) */
  lieu?: Coordonnees & { pays?: string }
  /** Ville de l'activité ou du logement */
  ville?: string
  /** Lien externe (fiche du lieu, recherche de logements) */
  lien?: string
  /** Proposition : de quoi rouvrir le voyage */
  voyage?: { depart: Lieu; arrivee: Lieu; reglages: Reglages; graine: number; total: number }
  ajouteLe: string
}

export const idFavoriDestination = (l: Coordonnees) => `destination:${l.lat.toFixed(4)},${l.lon.toFixed(4)}`

interface EtatFavoris {
  favoris: Favori[]
  /** Ajoute ou retire ; renvoie vrai si le favori est maintenant présent */
  basculer: (f: Omit<Favori, 'ajouteLe'>) => boolean
  retirer: (id: string) => void
  remplacer: (liste: Favori[]) => void
}

export const useFavoris = create<EtatFavoris>()(
  persist(
    (set, get) => ({
      favoris: [],
      basculer: (f) => {
        const present = get().favoris.some((x) => x.id === f.id)
        set(({ favoris }) => ({ favoris: present ? favoris.filter((x) => x.id !== f.id) : [{ ...f, ajouteLe: new Date().toISOString() }, ...favoris].slice(0, 200) }))
        return !present
      },
      retirer: (id) => set(({ favoris }) => ({ favoris: favoris.filter((x) => x.id !== id) })),
      remplacer: (favoris) => set({ favoris }),
    }),
    { name: 'budget-voyage:favoris', storage: createJSONStorage(() => stockageSur), partialize: ({ favoris }) => ({ favoris }) },
  ),
)

/** Vrai si l'élément est en favori (abonnement ciblé : le composant ne se redessine que pour lui). */
export const useEstFavori = (id: string) => useFavoris((s) => s.favoris.some((f) => f.id === id))
