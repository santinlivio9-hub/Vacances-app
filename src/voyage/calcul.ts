import { titreWikipedia } from '../carte/hooks'
import { calculerItineraire, versDonneesTrajet } from '../carte/itineraire'
import type { Itineraire, Lieu, Reglages } from '../domain/types'
import { coutsAvecActivites, estimerCouts, type EstimationCouts } from '../engine/couts'
import { genererItineraire } from '../engine/itineraire'
import { genererPropositions, type ResultatPropositions } from '../engine/propositions'
import { reglagesEffectifs } from '../engine/reglages'
import { trouverLieux } from '../services/lieux'
import { resumeWikipedia } from '../services/wikipedia'
import { cleVoyage, type BaseVoyage, type ResultatVoyage } from '../store/resultat'
import { dateDuJour } from '../store/voyage'
import { typeVoyage } from '../tripTypes'

export type IdEtape = 'trajet' | 'lieux' | 'prix' | 'itineraire' | 'propositions' | 'liens'
export interface Etape {
  id: IdEtape
  libelle: string
}

/** Étapes affichées pendant le calcul, selon ce qu'on calcule. */
export function etapesDuCalcul(reglages: Reglages, versVoyage: boolean): Etape[] {
  const calcul = typeVoyage(reglages.simple).calcul
  return [
    { id: 'trajet', libelle: 'Calcul du trajet' },
    { id: 'lieux', libelle: calcul === 'sejourLong' ? 'Recherche des sorties pour le week-end' : 'Recherche des lieux à visiter' },
    { id: 'prix', libelle: calcul === 'periodes' ? 'Comparaison des prix mois par mois' : calcul === 'sejourLong' ? 'Estimation des loyers et du coût de la vie' : 'Estimation des prix sur place' },
    { id: 'itineraire', libelle: calcul === 'sejourLong' ? 'Zones de logement autour du travail' : 'Construction de l’itinéraire jour par jour' },
    versVoyage ? { id: 'liens', libelle: 'Préparation des liens de réservation' } : { id: 'propositions', libelle: 'Comparaison des propositions' },
  ]
}

/** Rayon de recherche des lieux : plus large pour les petites villes et les séjours longs. */
const rayonRecherche = (nuits: number) => (nuits > 7 ? 18 : 12)

/**
 * Ce qui ne dépend que du trajet : route, lieux à visiter, résumé Wikipédia.
 * Chaque service a son repli : le calcul aboutit toujours.
 */
export async function calculerBase(depart: Lieu, arrivee: Lieu, reglages: Reglages, onEtape: (id: IdEtape, detail?: string) => void): Promise<BaseVoyage> {
  onEtape('trajet')
  const [itineraireCarte, resume] = await Promise.all([calculerItineraire(depart, arrivee), resumeWikipedia(titreWikipedia(arrivee)).catch(() => null)])
  onEtape('lieux')
  const { lieux, source } = await trouverLieux(arrivee, rayonRecherche(reglages.simple.nuits)).catch(() => ({ lieux: [], source: 'aucun' as const }))
  onEtape('lieux', source === 'osm' ? `${lieux.length} lieux trouvés sur OpenStreetMap` : source === 'wikipedia' ? `${lieux.length} lieux trouvés sur Wikipédia` : 'Aucun lieu trouvé : activités types proposées')
  return { itineraireCarte, lieux, sourceLieux: source, resume }
}

/** Itinéraire jour par jour pour des réglages donnés (rapide : pas d'appel réseau). */
export function itinerairePour(base: BaseVoyage, depart: Lieu, arrivee: Lieu, reglages: Reglages, graine: number): Itineraire {
  const trajet = versDonneesTrajet(depart, arrivee, base.itineraireCarte)
  const couts = estimerCouts({ trajet, arrivee, reglages })
  return genererItineraire({
    lieux: base.lieux,
    source: base.sourceLieux,
    centre: arrivee,
    ville: titreWikipedia(arrivee),
    reglages,
    indice: couts.pays.indice,
    mode: reglages.simple.transport,
    dureeAllerMin: couts.transport.possible ? couts.transport.dureeAllerMin : base.itineraireCarte.dureeMin,
    graine,
  })
}

export function resultatPour(base: BaseVoyage, depart: Lieu, arrivee: Lieu, reglages: Reglages, graine: number): ResultatVoyage {
  const itineraire = itinerairePour(base, depart, arrivee, reglages, graine)
  return { ...base, sourceLieux: itineraire.source, itineraire, cle: cleVoyage(depart, arrivee, reglages, graine) }
}

/** Toutes les propositions, chacune chiffrée avec le coût réel de son itinéraire. */
export function propositionsPour(base: BaseVoyage, depart: Lieu, arrivee: Lieu, reglages: Reglages, graine: number): ResultatPropositions {
  const trajet = versDonneesTrajet(depart, arrivee, base.itineraireCarte)
  const memo = new Map<string, { total: number; nombre: number }>()
  return genererPropositions({
    trajet,
    arrivee,
    reglages,
    aujourdhui: dateDuJour(),
    activites: (r) => {
      const cle = JSON.stringify(r)
      if (!memo.has(cle)) {
        const it = itinerairePour(base, depart, arrivee, r, graine)
        memo.set(cle, { total: it.totalActivites, nombre: it.jours.reduce((n, j) => n + j.activites.length, 0) })
      }
      return memo.get(cle)!
    },
  })
}

/** Coûts affichés : estimation, avec le coût réel des activités de l'itinéraire. */
export function coutsDuResultat(r: ResultatVoyage, depart: Lieu, arrivee: Lieu, reglages: Reglages): EstimationCouts {
  const trajet = versDonneesTrajet(depart, arrivee, r.itineraireCarte)
  const base = estimerCouts({ trajet, arrivee, reglages })
  return coutsAvecActivites(base, r.itineraire.totalActivites, reglagesEffectifs(reglages).tauxImprevus)
}
