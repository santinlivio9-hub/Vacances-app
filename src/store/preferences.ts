import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { stockageSur } from './stockageSur'
import type { Interet, Lieu, ReglagesSimples, Style, TypeLogement } from '../domain/types'

export type Theme = 'auto' | 'clair' | 'sombre'

/** Préférences par défaut, réutilisées dans chaque nouveau voyage. */
export interface Preferences {
  villeDepart: Lieu | null
  adultes: number
  enfants: number
  style: Style
  logements: TypeLogement[]
  interets: Interet[]
  modeAvance: boolean
  theme: Theme
  /** Vrai dès que l'utilisateur a enregistré ses préférences (sinon on garde les valeurs de l'app) */
  definies: boolean
  majLe: string
}

export const preferencesParDefaut = (): Preferences => ({
  villeDepart: null,
  adultes: 2,
  enfants: 0,
  style: 'equilibre',
  logements: ['hotel', 'appartement'],
  interets: ['culture', 'gastronomie'],
  modeAvance: false,
  theme: 'auto',
  definies: false,
  majLe: new Date(0).toISOString(),
})

/** Réglages simples d'un nouveau voyage, d'après les préférences. */
export function appliquerPreferences(s: ReglagesSimples, p: Preferences): ReglagesSimples {
  if (!p.definies) return s
  return { ...s, adultes: p.adultes, enfants: p.enfants, style: p.style, interets: p.interets, logements: p.logements.length ? p.logements : s.logements }
}

interface EtatPreferences extends Preferences {
  modifier: (p: Partial<Preferences>) => void
  remplacer: (p: Preferences) => void
}

export const usePreferences = create<EtatPreferences>()(
  persist(
    (set) => ({
      ...preferencesParDefaut(),
      // Changer seulement le thème ne compte pas comme « préférences de voyage définies »
      modifier: (p) => set({ ...p, ...(Object.keys(p).some((k) => k !== 'theme') ? { definies: true } : {}), majLe: new Date().toISOString() }),
      remplacer: (p) => set(p),
    }),
    {
      name: 'budget-voyage:preferences',
      storage: createJSONStorage(() => stockageSur),
      partialize: ({ modifier: _m, remplacer: _r, ...p }) => p,
    },
  ),
)

/** Les préférences seules (sans les actions), pour l'export et la synchronisation. */
export const lirePreferences = (): Preferences => {
  const { modifier: _m, remplacer: _r, ...p } = usePreferences.getState()
  return p
}
