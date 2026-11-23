import { lien, type Page } from '../lib/routes'

const LIENS: { page: Page; libelle: string; court: string }[] = [
  { page: 'simulateur', libelle: 'Simulateur', court: 'Simuler' },
  { page: 'budget', libelle: 'Mode budget', court: 'Budget' },
  { page: 'simulations', libelle: 'Mes simulations', court: 'Mes voyages' },
]

export function EnTete({ page }: { page: Page }) {
  return (
    <header className="sticky top-0 z-30 bg-linear-to-b from-ocean-50 via-ocean-50/80 to-transparent px-3 pt-3 pb-2 print:hidden sm:px-6 dark:from-ocean-950 dark:via-ocean-950/80">
      {/* presque opaque : la barre flotte au-dessus du texte qui défile */}
      <div className="verre mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-full py-1.5 pr-1.5 pl-4 [--verre-fond:0.92]">
        <a href={lien('accueil')} className="flex items-center gap-2 rounded-full font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500">
          <span aria-hidden="true" className="text-xl">
            🧳
          </span>
          <span className="hidden sm:inline">Budget Voyage</span>
          <span className="sr-only sm:hidden">Budget Voyage, accueil</span>
        </a>
        <nav aria-label="Navigation principale">
          <ul className="flex items-center gap-1">
            {LIENS.map((l) => {
              const actif = l.page === page || (page === 'recap' && l.page === 'simulateur')
              return (
                <li key={l.page}>
                  <a
                    href={lien(l.page)}
                    aria-current={l.page === page ? 'page' : undefined}
                    className={`flex min-h-10 items-center rounded-full px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 sm:px-4 ${
                      actif
                        ? 'bg-ocean-600 text-white dark:bg-ocean-500 dark:text-ocean-950'
                        : 'text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="sm:hidden">{l.court}</span>
                    <span className="hidden sm:inline">{l.libelle}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
