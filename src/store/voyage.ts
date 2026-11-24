import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CleAvancee, Lieu, ModeTransport, Reglages, ReglagesAvances, ReglagesSimples, TypeVoyage } from '../domain/types'
import { normaliserReglages, reglagesSimplesParDefaut } from '../engine/reglages'
import { changerTypeVoyage, harmoniserSimple } from '../tripTypes'
import { appliquerPreferences, usePreferences } from './preferences'
import { stockageSur } from './stockageSur'

export interface VoyageSauvegarde {
  id: string
  nom: string
  creeLe: string
  /** Dernière modification (sert à la synchronisation avec le compte) */
  majLe: string
  /** Brouillon : configuré mais jamais calculé */
  statut: 'brouillon' | 'calcule'
  depart: Lieu
  arrivee: Lieu
  reglages: Reglages
  graine: number
  /** Total estimé au moment de la sauvegarde */
  total?: number
  /** Proposition choisie (« Moins chère, Airbnb · train ») */
  proposition?: string
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
  /** Cases cochées de la checklist, par trajet : « clé du trajet:identifiant » */
  coches: Record<string, true>
  /** Le type de voyage a été choisi pour ce trajet (sinon on affiche les grandes cartes de choix) */
  typeChoisi: boolean

  definirDepart: (lieu: Lieu | null) => void
  definirArrivee: (lieu: Lieu | null) => void
  inverser: () => void
  modifierSimple: (partiel: Partial<ReglagesSimples>) => void
  choisirTypeVoyage: (type: TypeVoyage) => void
  modifierAvance: <K extends CleAvancee>(cle: K, valeur: ReglagesAvances[K]) => void
  /** Revient à la valeur par défaut (déduite du mode Simple) */
  reinitialiserAvance: (cle: CleAvancee) => void
  reinitialiserTousLesAvances: () => void
  basculerModeAvance: () => void
  /** Propose le mode de transport conseillé, une seule fois par trajet (ne réécrase pas un choix ultérieur) */
  appliquerModeConseille: (mode: ModeTransport) => void
  regenerer: () => void
  sauvegarder: (nom: string, infos?: { total?: number; proposition?: string }) => VoyageSauvegarde | null
  /** Enregistre (ou met à jour) le brouillon du trajet en cours */
  enregistrerBrouillon: () => void
  supprimerSauvegarde: (id: string) => void
  ouvrirSauvegarde: (id: string) => void
  /** Remplace la liste (fusion avec le compte) */
  remplacerSauvegardes: (liste: VoyageSauvegarde[]) => void
  /** Charge un voyage reçu par une adresse de partage */
  chargerVoyage: (v: { depart: Lieu; arrivee: Lieu; reglages: Reglages; graine: number }) => void
  /** Remet à zéro le voyage en cours, avec les préférences du compte */
  nouveauVoyage: () => void
  /** Applique un ensemble de changements (économies, proposition choisie) aux réglages */
  appliquerChangements: (c: { simple?: Partial<ReglagesSimples>; avances?: Partial<ReglagesAvances> }) => void
  /** Remplace les réglages (proposition choisie) */
  definirReglages: (r: Reglages) => void
  basculerCoche: (cle: string) => void
}

export function dateDuJour(maintenant = new Date()): string {
  const d2 = (n: number) => String(n).padStart(2, '0')
  return `${maintenant.getFullYear()}-${d2(maintenant.getMonth() + 1)}-${d2(maintenant.getDate())}`
}

const reglagesNeufs = (): Reglages => {
  const prefs = usePreferences.getState()
  return { simple: harmoniserSimple(appliquerPreferences(reglagesSimplesParDefaut(dateDuJour()), prefs)), modifies: {} }
}

export const etatInitial = () => {
  const prefs = usePreferences.getState()
  return {
    depart: prefs.definies ? prefs.villeDepart : null,
    arrivee: null as Lieu | null,
    reglages: reglagesNeufs(),
    modeAvance: prefs.definies ? prefs.modeAvance : false,
    graine: 1,
    sauvegardes: [] as VoyageSauvegarde[],
    trajetConseille: null as string | null,
    coches: {} as Record<string, true>,
    typeChoisi: false,
  }
}

export const cleTrajet = (depart: Lieu, arrivee: Lieu) =>
  `${depart.lat.toFixed(4)},${depart.lon.toFixed(4)}→${arrivee.lat.toFixed(4)},${arrivee.lon.toFixed(4)}`

const nouvelId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const maintenant = () => new Date().toISOString()
const idBrouillon = (depart: Lieu, arrivee: Lieu) => `brouillon-${cleTrajet(depart, arrivee)}`

/** Remet d'aplomb une sauvegarde d'une version précédente. */
export function normaliserSauvegarde(v: VoyageSauvegarde, aujourdhui = dateDuJour()): VoyageSauvegarde {
  return {
    ...v,
    statut: v.statut === 'brouillon' ? 'brouillon' : 'calcule',
    majLe: v.majLe ?? v.creeLe,
    reglages: normaliserReglages(v.reglages as never, aujourdhui),
  }
}

export const useVoyage = create<EtatVoyage>()(
  persist(
    (set, get) => ({
      ...etatInitial(),

      definirDepart: (depart) => set({ depart }),
      definirArrivee: (arrivee) => set(({ arrivee: avant }) => ({ arrivee, typeChoisi: avant && arrivee && avant.lat === arrivee.lat && avant.lon === arrivee.lon ? get().typeChoisi : false })),
      inverser: () => set(({ depart, arrivee }) => ({ depart: arrivee, arrivee: depart })),

      modifierSimple: (partiel) => set(({ reglages }) => ({ reglages: { ...reglages, simple: harmoniserSimple({ ...reglages.simple, ...partiel }) } })),
      choisirTypeVoyage: (type) => set(({ reglages }) => ({ typeChoisi: true, reglages: { ...reglages, simple: changerTypeVoyage(reglages.simple, type, dateDuJour()) } })),
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

      sauvegarder: (nom, infos = {}) => {
        const { depart, arrivee, reglages, graine, sauvegardes } = get()
        if (!depart || !arrivee) return null
        const voyage: VoyageSauvegarde = {
          id: nouvelId(),
          nom,
          creeLe: maintenant(),
          majLe: maintenant(),
          statut: 'calcule',
          depart,
          arrivee,
          reglages,
          graine,
          ...infos,
        }
        // Le brouillon de ce trajet n'a plus lieu d'être
        const brouillon = idBrouillon(depart, arrivee)
        set({ sauvegardes: [voyage, ...sauvegardes.filter((v) => v.id !== brouillon)].slice(0, 50) })
        return voyage
      },
      enregistrerBrouillon: () => {
        const { depart, arrivee, reglages, graine, sauvegardes } = get()
        if (!depart || !arrivee) return
        const id = idBrouillon(depart, arrivee)
        const existant = sauvegardes.find((v) => v.id === id)
        const brouillon: VoyageSauvegarde = {
          id,
          nom: `${depart.nom} → ${arrivee.nom}`,
          creeLe: existant?.creeLe ?? maintenant(),
          majLe: maintenant(),
          statut: 'brouillon',
          depart,
          arrivee,
          reglages,
          graine,
        }
        // Au plus 5 brouillons, les plus récents
        const autres = sauvegardes.filter((v) => v.id !== id)
        const brouillons = autres.filter((v) => v.statut === 'brouillon').slice(0, 4).map((v) => v.id)
        set({ sauvegardes: [brouillon, ...autres.filter((v) => v.statut !== 'brouillon' || brouillons.includes(v.id))] })
      },
      supprimerSauvegarde: (id) => set(({ sauvegardes }) => ({ sauvegardes: sauvegardes.filter((v) => v.id !== id) })),
      remplacerSauvegardes: (liste) => set({ sauvegardes: liste }),
      chargerVoyage: ({ depart, arrivee, reglages, graine }) =>
        set({ depart, arrivee, reglages: normaliserReglages(reglages as never, dateDuJour()), graine, trajetConseille: cleTrajet(depart, arrivee), typeChoisi: true }),
      nouveauVoyage: () => {
        const prefs = usePreferences.getState()
        set({ depart: prefs.definies && prefs.villeDepart ? prefs.villeDepart : get().depart, arrivee: null, reglages: reglagesNeufs(), graine: 1, typeChoisi: false, modeAvance: prefs.definies ? prefs.modeAvance : get().modeAvance })
      },
      appliquerChangements: (c) =>
        set(({ reglages }) => ({
          reglages: { simple: harmoniserSimple({ ...reglages.simple, ...c.simple }), modifies: { ...reglages.modifies, ...c.avances } },
        })),
      definirReglages: (reglages) => set({ reglages }),
      basculerCoche: (cle) =>
        set(({ coches }) => {
          const suivant = { ...coches }
          if (suivant[cle]) delete suivant[cle]
          else suivant[cle] = true
          return { coches: suivant }
        }),
      ouvrirSauvegarde: (id) => {
        const v = get().sauvegardes.find((s) => s.id === id)
        if (v) set({ depart: v.depart, arrivee: v.arrivee, reglages: normaliserReglages(v.reglages as never, dateDuJour()), graine: v.graine, trajetConseille: cleTrajet(v.depart, v.arrivee), typeChoisi: true })
      },
    }),
    {
      name: 'budget-voyage:v2',
      version: 2,
      storage: createJSONStorage(() => stockageSur),
      partialize: ({ depart, arrivee, reglages, modeAvance, graine, sauvegardes, trajetConseille, coches, typeChoisi }) => ({
        trajetConseille,
        coches,
        depart,
        arrivee,
        reglages,
        modeAvance,
        graine,
        sauvegardes,
        typeChoisi,
      }),
      // Version 1 : un seul type de logement, pas de type de voyage ni de brouillons
      migrate: (etat) => {
        const e = (etat ?? {}) as Partial<EtatVoyage>
        const aujourdhui = dateDuJour()
        return {
          ...e,
          reglages: e.reglages ? normaliserReglages(e.reglages as never, aujourdhui) : reglagesNeufs(),
          sauvegardes: (e.sauvegardes ?? []).map((v) => normaliserSauvegarde(v, aujourdhui)),
          typeChoisi: !!e.arrivee,
        } as EtatVoyage
      },
    },
  ),
)
