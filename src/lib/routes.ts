/**
 * Navigation par hash (#/page?paramètres) : GitHub Pages ne sait pas servir les autres
 * chemins d'une application monopage, alors que le hash ne quitte jamais le navigateur.
 */
export type Page = 'accueil' | 'simulateur' | 'budget' | 'recap' | 'simulations'

const PAGES: Page[] = ['accueil', 'simulateur', 'budget', 'recap', 'simulations']

export interface Route {
  page: Page
  params: URLSearchParams
}

export function lireRoute(hash: string): Route {
  const brut = hash.replace(/^#\/?/, '')
  const separateur = brut.indexOf('?')
  const chemin = separateur === -1 ? brut : brut.slice(0, separateur)
  const requete = separateur === -1 ? '' : brut.slice(separateur + 1)
  return {
    page: PAGES.includes(chemin as Page) ? (chemin as Page) : 'accueil',
    params: new URLSearchParams(requete),
  }
}

export function lien(page: Page, params?: URLSearchParams): string {
  const requete = params?.toString() ?? ''
  const chemin = page === 'accueil' ? '' : page
  return `#/${chemin}${requete ? `?${requete}` : ''}`
}
