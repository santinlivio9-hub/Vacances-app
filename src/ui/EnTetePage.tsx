import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { classeEnTeteVerre, useDefile } from './useDefile'

/** En-tête collant des écrans secondaires (titre, retour facultatif, actions à droite). */
export function EnTetePage({ titre, retour, libelleRetour = 'Retour', children }: { titre: string; retour?: string; libelleRetour?: string; children?: ReactNode }) {
  const defile = useDefile()
  return (
    <header className={`sticky top-0 z-30 print:hidden ${classeEnTeteVerre(defile)}`}>
      <div className="mx-auto flex min-h-14 max-w-2xl items-center gap-2 px-3 py-2">
        {retour && (
          <Link to={retour} className="verre grid size-11 shrink-0 place-items-center rounded-full [--verre-fond:0.6] hover:brightness-105" aria-label={libelleRetour}>
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <h1 className={`text-lg font-semibold ${retour ? '' : 'pl-1'}`}>{titre}</h1>
        {children}
      </div>
    </header>
  )
}
