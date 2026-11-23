import { useId, type ReactNode } from 'react'

interface Props {
  titre: string
  sousTitre?: string
  children: ReactNode
  className?: string
}

/** Carte « verre » avec un titre, pour regrouper un bloc du formulaire. */
export function Section({ titre, sousTitre, children, className = '' }: Props) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={`verre rounded-3xl p-5 sm:p-6 ${className}`}>
      <h2 id={id} className="text-lg font-semibold">
        {titre}
      </h2>
      {sousTitre && <p className="text-sm text-slate-600 dark:text-slate-300">{sousTitre}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
