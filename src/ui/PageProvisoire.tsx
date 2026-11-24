import { Link } from 'react-router'
import { MentionDonnees } from './MentionDonnees'

/** Écran pas encore construit (refonte en cours). */
export function PageProvisoire({ titre, phase }: { titre: string; phase: number }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">{titre}</h1>
      <p className="text-slate-600 dark:text-slate-300">Cet écran arrive à la phase {phase} de la refonte.</p>
      <Link to="/" className="rounded-full bg-ocean-600 px-5 py-3 font-semibold text-white">
        Retour à la carte
      </Link>
      <MentionDonnees />
    </main>
  )
}
