import { destinations } from '../data'
import { prixIndicatifParJour } from '../engine/indicatifs'
import { formaterEuros } from '../lib/format'
import { lien } from '../lib/routes'
import { lireSimulations } from '../lib/stockage'

const carte =
  'group verre flex flex-col justify-between gap-6 rounded-[2rem] p-6 transition hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500 sm:p-8'

export function Accueil() {
  const sauvegardees = lireSimulations().length

  return (
    <div className="space-y-10 pt-4 sm:pt-10">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">Combien vont coûter vos vacances ?</h1>
        <p className="mt-3 text-lg text-slate-700 dark:text-slate-200">
          Transport, logement, repas, activités : une estimation claire, poste par poste, depuis n’importe quelle ville de France.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <a href={lien('simulateur')} className={`${carte} md:col-span-3 [--verre-fond:0.7]`}>
          <span aria-hidden="true" className="text-5xl">
            🧮
          </span>
          <span>
            <span className="block text-2xl font-bold sm:text-3xl">Combien va coûter mon voyage ?</span>
            <span className="mt-2 block text-slate-700 dark:text-slate-200">
              Choisissez une destination, réglez les détails : le total se calcule en direct.
            </span>
            <span className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-ocean-600 px-5 font-semibold text-white transition group-hover:bg-ocean-700 dark:bg-ocean-500 dark:text-ocean-950">
              Lancer le simulateur <span aria-hidden="true">→</span>
            </span>
          </span>
        </a>
        <a href={lien('budget')} className={`${carte} md:col-span-2`}>
          <span aria-hidden="true" className="text-5xl">
            💶
          </span>
          <span>
            <span className="block text-2xl font-bold">J’ai un budget, où partir ?</span>
            <span className="mt-2 block text-slate-700 dark:text-slate-200">
              Indiquez votre budget : on vous montre les destinations qui rentrent dedans.
            </span>
            <span className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-ocean-700 dark:text-ocean-200">
              Trouver une destination <span aria-hidden="true">→</span>
            </span>
          </span>
        </a>
      </div>

      <section aria-labelledby="titre-envies">
        <h2 id="titre-envies" className="mb-3 text-lg font-semibold">
          Une envie précise ?
        </h2>
        <ul className="flex flex-wrap gap-2">
          {destinations.map((d) => (
            <li key={d.id}>
              <a
                href={lien('simulateur', new URLSearchParams({ d: d.id }))}
                className="verre flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 dark:hover:bg-white/10"
              >
                <span aria-hidden="true">{d.emoji}</span>
                {d.nom}
                <span className="text-slate-600 dark:text-slate-300">≈ {formaterEuros(prixIndicatifParJour(d))}/j</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {sauvegardees > 0 && (
        <p>
          <a href={lien('simulations')} className="font-semibold text-ocean-700 underline-offset-4 hover:underline dark:text-ocean-200">
            Retrouver mes {sauvegardees} simulation{sauvegardees > 1 ? 's' : ''} sauvegardée{sauvegardees > 1 ? 's' : ''} →
          </a>
        </p>
      )}
    </div>
  )
}
