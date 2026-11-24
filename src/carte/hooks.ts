import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Lieu, ResumeWikipedia } from '../domain/types'
import { resumeWikipedia } from '../services/wikipedia'
import { calculerItineraire, type ItineraireCarte } from './itineraire'

export function useDebounce<T>(valeur: T, delaiMs = 300): T {
  const [retardee, setRetardee] = useState(valeur)
  useEffect(() => {
    const t = setTimeout(() => setRetardee(valeur), delaiMs)
    return () => clearTimeout(t)
  }, [valeur, delaiMs])
  return retardee
}

const requeteSombre = '(prefers-color-scheme: dark)'
export function useSombre(): boolean {
  return useSyncExternalStore(
    (rappel) => {
      const mq = window.matchMedia(requeteSombre)
      mq.addEventListener('change', rappel)
      return () => mq.removeEventListener('change', rappel)
    },
    () => window.matchMedia(requeteSombre).matches,
    () => false,
  )
}

export function useLarge(minPx = 1024): boolean {
  const requete = `(min-width: ${minPx}px)`
  return useSyncExternalStore(
    (rappel) => {
      const mq = window.matchMedia(requete)
      mq.addEventListener('change', rappel)
      return () => mq.removeEventListener('change', rappel)
    },
    () => window.matchMedia(requete).matches,
    () => false,
  )
}

type Etat<T> = { statut: 'vide' } | { statut: 'chargement' } | { statut: 'ok'; valeur: T }

/** Itinéraire entre départ et arrivée : route OSRM, estimation ou arc d'avion. */
export function useItineraire(depart: Lieu | null, arrivee: Lieu | null): Etat<ItineraireCarte> {
  const [etat, setEtat] = useState<Etat<ItineraireCarte>>({ statut: 'vide' })
  const cle = depart && arrivee ? `${depart.lat},${depart.lon};${arrivee.lat},${arrivee.lon}` : ''
  useEffect(() => {
    if (!depart || !arrivee) {
      setEtat({ statut: 'vide' })
      return
    }
    const controle = new AbortController()
    setEtat({ statut: 'chargement' })
    calculerItineraire(depart, arrivee, controle.signal)
      .then((valeur) => setEtat({ statut: 'ok', valeur }))
      .catch(() => {
        /* annulé : un autre trajet a été demandé */
      })
    return () => controle.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])
  return etat
}

const TYPES_VILLE = new Set(['city', 'town', 'village', 'municipality', 'state', 'country', 'county', 'district', 'administrative', 'locality', 'island', 'region'])

/** Titre Wikipédia le plus probable pour un lieu : la ville elle-même, ou la ville d'une adresse. */
export function titreWikipedia(lieu: Lieu): string {
  if (!lieu.type || TYPES_VILLE.has(lieu.type)) return lieu.nom
  const ville = lieu.detail.split(',')[0]?.trim()
  return ville || lieu.nom
}

/** Résumé et photo Wikipédia d'une destination (null si introuvable). */
export function useResume(lieu: Lieu | null): ResumeWikipedia | null | undefined {
  const titre = lieu ? titreWikipedia(lieu) : null
  const [resume, setResume] = useState<{ titre: string; valeur: ResumeWikipedia | null } | null>(null)
  useEffect(() => {
    if (!titre) return
    let actif = true
    resumeWikipedia(titre).then((valeur) => actif && setResume({ titre, valeur }))
    return () => {
      actif = false
    }
  }, [titre])
  if (!titre) return null
  return resume?.titre === titre ? resume.valeur : undefined // undefined = en cours
}
