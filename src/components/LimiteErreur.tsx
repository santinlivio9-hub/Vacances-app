import { Component, type ReactNode } from 'react'
import { lien } from '../lib/routes'
import { boutonPrincipal } from '../lib/styles'

interface Etat {
  erreur: Error | null
}

/** Empêche une erreur inattendue d'afficher une page blanche. */
export class LimiteErreur extends Component<{ children: ReactNode }, Etat> {
  state: Etat = { erreur: null }

  static getDerivedStateFromError(erreur: Error): Etat {
    return { erreur }
  }

  render() {
    if (!this.state.erreur) return this.props.children
    return (
      <div role="alert" className="verre mx-auto max-w-lg rounded-3xl p-6 text-center">
        <p className="text-4xl" aria-hidden="true">
          🧭
        </p>
        <h1 className="mt-2 text-xl font-semibold">Oups, quelque chose s’est mal passé</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Le lien est peut-être incomplet. Vous pouvez repartir de l’accueil ; vos simulations sauvegardées sont conservées.
        </p>
        <a href={lien('accueil')} className={`${boutonPrincipal} mt-5`}>
          Revenir à l’accueil
        </a>
      </div>
    )
  }
}
