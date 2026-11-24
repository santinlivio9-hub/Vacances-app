import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { stockageSur } from './stockageSur'
import type { Interet, Lieu, ReglagesSimples, Style, TypeLogement } from '../domain/types'

export type Theme = 'auto' | 'clair' | 'sombre'
/** Effet verre : complet (flou et reflets), léger (moins de flou, plus fluide), désactivé (surfaces opaques) ; auto = léger sur mobile */
export type EffetVerre = 'auto' | 'complet' | 'leger' | 'desactive'

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
  effetVerre: EffetVerre
  /** Barre latérale ouverte sur ordinateur (repliée par défaut) */
  barreOuverte: boolean
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
  effetVerre: 'auto',
  barreOuverte: false,
  definies: false,
  majLe: new Date(0).toISOString(),
})

/** Réglages simples d'un nouveau voyage, d'après les préférences. */
export function appliquerPreferences(s: ReglagesSimples, p: Preferences): ReglagesSimples {
  if (!p.definies) return s
  return { ...s, adultes: p.adultes, enfants: p.enfants, style: p.style, interets: p.interets, logements: p.logements.length ? p.logements : s.logements }
}

const AFFICHAGE = ['theme', 'effetVerre', 'barreOuverte']

interface EtatPreferences extends Preferences {
  modifier: (p: Partial<Preferences>) => void
  remplacer: (p: Preferences) => void
}

export const usePreferences = create<EtatPreferences>()(
  persist(
    (set) => ({
      ...preferencesParDefaut(),
      // Changer seulement l'affichage (thème, verre, barre) ne compte pas comme « préférences de voyage définies »
      modifier: (p) => set({ ...p, ...(Object.keys(p).some((k) => !AFFICHAGE.includes(k)) ? { definies: true } : {}), majLe: new Date().toISOString() }),
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
