import { CloudOff, UserRound, type LucideIcon } from 'lucide-react'
import { effacerDonneesLocales } from './donnees'

const carte = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10'

/** Mode invité : tout fonctionne, les données restent sur l'appareil. */
export function SectionConnexion(_props: { onMessage: (t: string) => void }) {
  return (
    <section className={carte} aria-labelledby="titre-connexion">
      <div className="flex items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ocean-100 text-ocean-700 dark:bg-ocean-800 dark:text-ocean-100">
          <UserRound className="size-7" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="titre-connexion" className="font-semibold">
            Mode invité
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Vos voyages, favoris et préférences sont enregistrés sur cet appareil.</p>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-900/5 px-3 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
        <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        La connexion n’est pas activée sur cette version du site.
      </p>
    </section>
  )
}

SectionConnexion.BoutonSuppression = function BoutonSuppression({ onMessage, icone: Icone }: { onMessage: (t: string) => void; icone: LucideIcon }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm('Effacer vos voyages, favoris et préférences de cet appareil ? Cette action est définitive.')) return
        effacerDonneesLocales()
        onMessage('Données effacées de cet appareil.')
      }}
      className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 dark:text-red-300 dark:ring-red-900 dark:hover:bg-red-950/40"
    >
      <Icone className="size-4" aria-hidden /> Effacer les données de cet appareil
    </button>
  )
}
