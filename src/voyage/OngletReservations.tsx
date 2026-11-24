import { Check, ExternalLink } from 'lucide-react'
import type { CategorieLien, ElementChecklist, LienReservation } from '../engine/liens'

const CATEGORIES: Record<CategorieLien, string> = { transport: 'Transport', logement: 'Logement', activites: 'Activités', pratique: 'Pratique' }

export function OngletReservations({ liens, checklist, coche, onCocher }: { liens: LienReservation[]; checklist: ElementChecklist[]; coche: (id: string) => boolean; onCocher: (id: string) => void }) {
  const faits = checklist.filter((c) => coche(c.id)).length
  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <section aria-labelledby="titre-checklist" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
        <h3 id="titre-checklist" className="font-semibold">
          Avant de partir <span className="font-normal text-slate-500 dark:text-slate-400">· {faits} / {checklist.length}</span>
        </h3>
        <ul className="mt-2">
          {checklist.map((c) => {
            const fait = coche(c.id)
            return (
              <li key={c.id}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
                  <input type="checkbox" className="peer sr-only" checked={fait} onChange={() => onCocher(c.id)} />
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-2 ring-slate-300 peer-checked:bg-(--statut-ok) peer-checked:ring-(--statut-ok) peer-focus-visible:outline-2 peer-focus-visible:outline-ocean-500 dark:ring-slate-600" aria-hidden>
                    {fait && <Check className="size-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className={`text-sm ${fait ? 'text-slate-500 line-through' : ''}`}>{c.libelle}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="space-y-5">
        {(Object.keys(CATEGORIES) as CategorieLien[])
          .filter((cat) => liens.some((l) => l.categorie === cat))
          .map((cat) => (
            <section key={cat} aria-labelledby={`liens-${cat}`}>
              <h3 id={`liens-${cat}`} className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {CATEGORIES[cat]}
              </h3>
              <ul className="space-y-2">
                {liens
                  .filter((l) => l.categorie === cat)
                  .map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5 hover:ring-ocean-400 dark:bg-slate-900 dark:ring-white/10">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{l.titre}</span>
                          <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{l.description}</span>
                          {l.preRempli && <span className="mt-1 inline-block rounded-full bg-ocean-100 px-2 py-0.5 text-[11px] font-semibold text-ocean-800 dark:bg-ocean-800 dark:text-ocean-100">dates et voyageurs pré-remplis</span>}
                        </span>
                        <ExternalLink className="size-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="sr-only">(nouvel onglet)</span>
                      </a>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        <p className="text-xs text-slate-500 dark:text-slate-400">Liens directs vers les sites, sans affiliation : nous ne touchons aucune commission.</p>
      </div>
    </div>
  )
}
