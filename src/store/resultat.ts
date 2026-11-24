import { create } from 'zustand'
import type { Itineraire, Lieu, LieuVisite, Reglages, ResumeWikipedia } from '../domain/types'
import type { ItineraireCarte } from '../carte/itineraire'

/** Résultat du dernier calcul (non persisté : recalculé au besoin, les services sont en cache). */
export interface ResultatVoyage {
  cle: string
  itineraireCarte: ItineraireCarte
  lieux: LieuVisite[]
  sourceLieux: Itineraire['source']
  itineraire: Itineraire
  resume: ResumeWikipedia | null
}

/** Identifie un voyage : si un réglage change, il faut recalculer. */
export const cleVoyage = (depart: Lieu, arrivee: Lieu, reglages: Reglages, graine: number) =>
  JSON.stringify([depart.lat, depart.lon, arrivee.lat, arrivee.lon, reglages, graine])

export const useResultat = create<{
  resultat: ResultatVoyage | null
  definir: (r: ResultatVoyage) => void
  remplacerItineraire: (i: Itineraire) => void
}>()((set) => ({
  resultat: null,
  definir: (resultat) => set({ resultat }),
  remplacerItineraire: (itineraire) => set(({ resultat }) => (resultat ? { resultat: { ...resultat, itineraire } } : {})),
}))
