import { ChevronDown, Minus, Plus, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useId, useState, type ReactNode } from 'react'

/** Carte repliable (accordéon). */
export function CarteReglage({
  titre,
  icone: Icone,
  resume,
  modifies = 0,
  ouverteParDefaut = true,
  onReinitialiser,
  children,
}: {
  titre: string
  icone: typeof Plus
  resume?: string
  modifies?: number
  ouverteParDefaut?: boolean
  onReinitialiser?: () => void
  children: ReactNode
}) {
  const [ouverte, setOuverte] = useState(ouverteParDefaut)
  const id = useId()
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-[#0e1f45] dark:ring-white/10">
      <h2>
        <button
          type="button"
          onClick={() => setOuverte((o) => !o)}
          aria-expanded={ouverte}
          aria-controls={id}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-ocean-50 text-ocean-700 dark:bg-ocean-900/60 dark:text-ocean-200">
            <Icone className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-semibold">
              {titre}
              {modifies > 0 && (
                <span className="rounded-full bg-corail-300/40 px-2 py-0.5 text-[11px] font-semibold text-corail-700 dark:bg-corail-700/40 dark:text-corail-300">
                  {modifies} modifié{modifies > 1 ? 's' : ''}
                </span>
              )}
            </span>
            {resume && <span className="block truncate text-sm font-normal text-slate-500 dark:text-slate-400">{resume}</span>}
          </span>
          <ChevronDown className={`size-5 shrink-0 text-slate-400 transition-transform ${ouverte ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {ouverte && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-5 px-4 pt-1 pb-5">
              {children}
              {onReinitialiser && modifies > 0 && (
                <button type="button" onClick={onReinitialiser} className="inline-flex items-center gap-1.5 text-sm font-medium text-ocean-700 hover:underline dark:text-ocean-300">
                  <RotateCcw className="size-3.5" aria-hidden />
                  Revenir aux valeurs conseillées pour cette section
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/** Libellé d'un réglage, avec le badge « modifié » et le bouton pour revenir à la valeur conseillée. */
export function Reglage({
  libelle,
  aide,
  modifie,
  onReinitialiser,
  valeur,
  children,
  htmlFor,
}: {
  libelle: string
  aide?: string
  modifie?: boolean
  onReinitialiser?: () => void
  valeur?: ReactNode
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex min-h-6 items-center gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {libelle}
        </label>
        {modifie && (
          <>
            <span className="size-2 rounded-full bg-corail-500" title="Modifié" aria-label="modifié" role="img" />
            {onReinitialiser && (
              <button type="button" onClick={onReinitialiser} className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-slate-900/5 hover:text-ocean-700 dark:hover:bg-white/10" aria-label={`Revenir à la valeur conseillée pour « ${libelle} »`} title="Revenir à la valeur conseillée">
                <RotateCcw className="size-3.5" />
              </button>
            )}
          </>
        )}
        {valeur !== undefined && <span className="ml-auto text-sm font-semibold tabular-nums">{valeur}</span>}
      </div>
      {children}
      {aide && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{aide}</p>}
    </div>
  )
}

export function Compteur({ valeur, min, max, onChange, libelle, unite }: { valeur: number; min: number; max: number; onChange: (v: number) => void; libelle: string; unite?: (v: number) => string }) {
  const bouton = 'grid size-11 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-ocean-100 disabled:opacity-40 dark:bg-white/10 dark:text-slate-100'
  return (
    <div className="flex items-center gap-3" role="group" aria-label={libelle}>
      <button type="button" className={bouton} disabled={valeur <= min} onClick={() => onChange(valeur - 1)} aria-label={`${libelle} : un de moins`}>
        <Minus className="size-4" />
      </button>
      <output aria-live="polite" className="min-w-16 text-center text-lg font-semibold tabular-nums">
        {unite ? unite(valeur) : valeur}
      </output>
      <button type="button" className={bouton} disabled={valeur >= max} onClick={() => onChange(valeur + 1)} aria-label={`${libelle} : un de plus`}>
        <Plus className="size-4" />
      </button>
    </div>
  )
}

export interface Option<T> {
  valeur: T
  libelle: string
  detail?: string
  icone?: typeof Plus
  desactive?: boolean
  titre?: string
}

/** Choix exclusif. `compact` : libellés courts sur une seule ligne (ex. « 20 min »), boutons de même hauteur. */
export function Segments<T extends string | number>({ nom, valeur, options, onChange, colonnes, compact = false }: { nom: string; valeur: T; options: Option<T>[]; onChange: (v: T) => void; colonnes?: string; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label={nom} className={`grid ${compact ? 'gap-1.5' : 'gap-2'} ${colonnes ?? (options.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}`}>
      {options.map((o) => {
        const choisi = o.valeur === valeur
        const Icone = o.icone
        return (
          <button
            key={String(o.valeur)}
            type="button"
            role="radio"
            aria-checked={choisi}
            disabled={o.desactive}
            title={o.titre}
            onClick={() => onChange(o.valeur)}
            className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-center text-sm ring-1 transition ${compact ? 'px-1 whitespace-nowrap' : 'px-2'} ${
              choisi
                ? 'bg-ocean-700 font-semibold text-white ring-ocean-700 dark:bg-white dark:text-[#0c2452] dark:shadow-[0_6px_16px_-6px_rgb(0_0_0/0.5)] dark:ring-white'
                : 'bg-white text-slate-700 ring-slate-900/10 hover:ring-ocean-400 dark:bg-white/8 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] dark:ring-white/12'
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            {Icone && <Icone className="size-5" aria-hidden />}
            <span>{o.libelle}</span>
            {o.detail && <span className={`text-xs ${choisi ? 'text-white/85 dark:text-[#0c2452]/75' : 'text-slate-500 dark:text-slate-300'}`}>{o.detail}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Interrupteur({ libelle, aide, valeur, onChange, modifie, onReinitialiser }: { libelle: string; aide?: string; valeur: boolean; onChange: (v: boolean) => void; modifie?: boolean; onReinitialiser?: () => void }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {libelle}
          </label>
          {modifie && (
            <>
              <span className="size-2 rounded-full bg-corail-500" aria-label="modifié" role="img" />
              {onReinitialiser && (
                <button type="button" onClick={onReinitialiser} className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10" aria-label={`Revenir à la valeur conseillée pour « ${libelle} »`}>
                  <RotateCcw className="size-3.5" />
                </button>
              )}
            </>
          )}
        </span>
        {aide && <p className="text-xs text-slate-500 dark:text-slate-400">{aide}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={valeur}
        onClick={() => onChange(!valeur)}
        className={`relative h-8 w-13 shrink-0 rounded-full transition ${valeur ? 'bg-ocean-600' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${valeur ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

export function Curseur({ id, min, max, pas, valeur, onChange, libelle, texte }: { id?: string; min: number; max: number; pas: number; valeur: number; onChange: (v: number) => void; libelle: string; texte?: string }) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={pas}
      value={valeur}
      aria-label={libelle}
      aria-valuetext={texte}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-11 w-full cursor-pointer accent-ocean-600"
    />
  )
}

/** Puces à choix multiples. */
export function Puces<T extends string>({ nom, valeurs, options, onChange }: { nom: string; valeurs: T[]; options: Option<T>[]; onChange: (v: T[]) => void }) {
  return (
    <div role="group" aria-label={nom} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const choisi = valeurs.includes(o.valeur)
        const Icone = o.icone
        return (
          <button
            key={o.valeur}
            type="button"
            aria-pressed={choisi}
            onClick={() => onChange(choisi ? valeurs.filter((v) => v !== o.valeur) : [...valeurs, o.valeur])}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm ring-1 transition ${
              choisi ? 'bg-ocean-700 font-semibold text-white ring-ocean-700' : 'bg-white text-slate-700 ring-slate-900/10 hover:ring-ocean-400 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10'
            }`}
          >
            {Icone && <Icone className="size-4" aria-hidden />}
            {o.libelle}
          </button>
        )
      })}
    </div>
  )
}
