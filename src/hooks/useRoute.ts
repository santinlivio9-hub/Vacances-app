import { useEffect, useState } from 'react'
import { lien, lireRoute, type Page } from '../lib/routes'

/** Page courante, lue dans le hash de l'URL ; se met à jour à chaque navigation. */
export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const surNavigation = () => {
      setHash(window.location.hash)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', surNavigation)
    return () => window.removeEventListener('hashchange', surNavigation)
  }, [])

  return { hash, ...lireRoute(hash) }
}

/** Met les paramètres dans l'URL sans créer d'entrée d'historique (l'URL reste partageable). */
export function remplacerParametres(page: Page, params: URLSearchParams) {
  const cible = lien(page, params)
  if (window.location.hash !== cible) window.history.replaceState(window.history.state, '', cible)
}
