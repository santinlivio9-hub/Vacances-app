import { create } from 'zustand'
import type { Itineraire, Lieu, LieuVisite, Reglages, ResumeWikipedia } from '../domain/types'
import type { ItineraireCarte } from '../carte/itineraire'
import type { ResultatPropositions } from '../engine/propositions'

/** Ce qui ne dépend que du trajet : route, lieux à visiter, photo (calculé une fois pour toutes les propositions). */
export interface BaseVoyage {
  itineraireCarte: ItineraireCarte
  lieux: LieuVisite[]
  sourceLieux: Itineraire['source']
  resume: ResumeWikipedia | null
}

/** Résultat du dernier calcul (non persisté : recalculé au besoin, les services sont en cache). */
export interface ResultatVoyage extends BaseVoyage {
  cle: string
  itineraire: Itineraire
}

export interface PropositionsCalculees extends ResultatPropositions {
  /** Réglages demandés (avant le choix d'une proposition) */
  cle: string
  reglages: Reglages
  graine: number
  base: BaseVoyage
  /** Proposition ouverte dans « Mon voyage » */
  choisie: string | null
}

/** Identifie un voyage : si un réglage change, il faut recalculer. */
export const cleVoyage = (depart: Lieu, arrivee: Lieu, reglages: Reglages, graine: number) =>
  JSON.stringify([depart.lat, depart.lon, arrivee.lat, arrivee.lon, reglages, graine])

export const useResultat = create<{
  resultat: ResultatVoyage | null
  propositions: PropositionsCalculees | null
  definir: (r: ResultatVoyage) => void
  definirPropositions: (p: PropositionsCalculees) => void
  marquerChoisie: (id: string | null) => void
  remplacerItineraire: (i: Itineraire) => void
}>()((set) => ({
  resultat: null,
  propositions: null,
  definir: (resultat) => set({ resultat }),
  definirPropositions: (propositions) => set({ propositions }),
  marquerChoisie: (choisie) => set(({ propositions }) => (propositions ? { propositions: { ...propositions, choisie } } : {})),
  remplacerItineraire: (itineraire) => set(({ resultat }) => (resultat ? { resultat: { ...resultat, itineraire } } : {})),
}))
