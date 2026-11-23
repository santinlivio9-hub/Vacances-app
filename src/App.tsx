import type { ComponentType } from 'react'
import { EnTete } from './components/EnTete'
import { Fond } from './components/Fond'
import { LimiteErreur } from './components/LimiteErreur'
import { useRoute } from './hooks/useRoute'
import { MENTION_ESTIMATION } from './lib/libelles'
import type { Page } from './lib/routes'
import { Accueil } from './pages/Accueil'
import { Budget } from './pages/Budget'
import { Recap } from './pages/Recap'
import { Simulateur } from './pages/Simulateur'
import { Simulations } from './pages/Simulations'

const PAGES: Record<Page, ComponentType<{ params: URLSearchParams }>> = {
  accueil: Accueil,
  simulateur: Simulateur,
  budget: Budget,
  recap: Recap,
  simulations: Simulations,
}

const TITRES: Record<Page, string> = {
  accueil: 'Budget Voyage — simulateur de coût de vacances',
  simulateur: 'Simulateur — Budget Voyage',
  budget: 'Où partir avec mon budget ? — Budget Voyage',
  recap: 'Récapitulatif — Budget Voyage',
  simulations: 'Mes simulations — Budget Voyage',
}

const SOURCES = 'https://github.com/santinlivio9-hub/Vacances-app/blob/main/src/data/SOURCES.md'

export default function App() {
  const { hash, page, params } = useRoute()
  const PageCourante = PAGES[page]
  document.title = TITRES[page]

  return (
    <>
      <div className="print:hidden">
        <Fond />
      </div>
      <a
        href="#contenu"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('contenu')?.focus()
        }}
        className="sr-only z-50 rounded-full bg-ocean-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <EnTete page={page} />
      <main id="contenu" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-6 pb-28 focus:outline-none sm:px-6 lg:pb-12">
        <LimiteErreur key={hash}>
          <PageCourante key={hash} params={params} />
        </LimiteErreur>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-28 text-center text-xs text-slate-600 sm:px-6 lg:pb-10 dark:text-slate-400">
        {MENTION_ESTIMATION} ·{' '}
        <a href={SOURCES} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 print:no-underline">
          sources et méthode
        </a>
      </footer>
    </>
  )
}
