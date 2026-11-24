import { titreWikipedia } from '../carte/hooks'
import { calculerItineraire, versDonneesTrajet } from '../carte/itineraire'
import type { Lieu, Reglages } from '../domain/types'
import { coutsAvecActivites, estimerCouts, type EstimationCouts } from '../engine/couts'
import { genererItineraire } from '../engine/itineraire'
import { reglagesEffectifs } from '../engine/reglages'
import { trouverLieux } from '../services/lieux'
import { resumeWikipedia } from '../services/wikipedia'
import { cleVoyage, type ResultatVoyage } from '../store/resultat'

export const ETAPES = [
  { id: 'trajet', libelle: 'Calcul du trajet' },
  { id: 'lieux', libelle: 'Recherche des lieux à visiter' },
  { id: 'prix', libelle: 'Estimation des prix sur place' },
  { id: 'itineraire', libelle: 'Construction de l’itinéraire jour par jour' },
  { id: 'liens', libelle: 'Préparation des liens de réservation' },
] as const
export type IdEtape = (typeof ETAPES)[number]['id']

/** Rayon de recherche des lieux : plus large pour les petites villes et les séjours longs. */
const rayonRecherche = (nuits: number) => (nuits > 7 ? 18 : 12)

/**
 * Calcule tout le voyage. Chaque service a son repli : le calcul aboutit toujours,
 * au pire avec une estimation à vol d'oiseau et des activités génériques.
 */
export async function calculerVoyage(
  depart: Lieu,
  arrivee: Lieu,
  reglages: Reglages,
  graine: number,
  onEtape: (id: IdEtape, detail?: string) => void,
  signal?: AbortSignal,
): Promise<ResultatVoyage> {
  onEtape('trajet')
  const [itineraireCarte, resume] = await Promise.all([
    calculerItineraire(depart, arrivee, signal),
    resumeWikipedia(titreWikipedia(arrivee), signal).catch(() => null),
  ])

  onEtape('lieux')
  const { lieux, source } = await trouverLieux(arrivee, rayonRecherche(reglages.simple.nuits), signal).catch(() => ({ lieux: [], source: 'aucun' as const }))
  onEtape('lieux', source === 'osm' ? `${lieux.length} lieux trouvés sur OpenStreetMap` : source === 'wikipedia' ? `${lieux.length} lieux trouvés sur Wikipédia` : 'Aucun lieu trouvé : activités types proposées')

  onEtape('prix')
  const trajet = versDonneesTrajet(depart, arrivee, itineraireCarte)
  const couts = estimerCouts({ trajet, arrivee, reglages })

  onEtape('itineraire')
  const itineraire = genererItineraire({
    lieux,
    source,
    centre: arrivee,
    ville: titreWikipedia(arrivee),
    reglages,
    indice: couts.pays.indice,
    mode: reglages.simple.transport,
    dureeAllerMin: couts.transport.possible ? couts.transport.dureeAllerMin : itineraireCarte.dureeMin,
    graine,
  })

  onEtape('liens')
  return { cle: cleVoyage(depart, arrivee, reglages, graine), itineraireCarte, lieux, sourceLieux: itineraire.source, itineraire, resume }
}

/** Coûts affichés : estimation, avec le coût réel des activités de l'itinéraire. */
export function coutsDuResultat(r: ResultatVoyage, depart: Lieu, arrivee: Lieu, reglages: Reglages): EstimationCouts {
  const trajet = versDonneesTrajet(depart, arrivee, r.itineraireCarte)
  const base = estimerCouts({ trajet, arrivee, reglages })
  return coutsAvecActivites(base, r.itineraire.totalActivites, reglagesEffectifs(reglages).tauxImprevus)
}
