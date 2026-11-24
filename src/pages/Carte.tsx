import { Link } from 'react-router'
import { useVoyage } from '../store/voyage'
import { MentionDonnees } from '../ui/MentionDonnees'

/** Écran Carte : construit à la phase 2. Pour l'instant, rappel de l'état du voyage. */
export default function Carte() {
  const { depart, arrivee } = useVoyage()
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Budget Voyage</h1>
      <p className="text-slate-600 dark:text-slate-300">La carte arrive à la phase 2 de la refonte.</p>
      <p className="text-sm">
        Départ : {depart?.nom ?? '—'} · Arrivée : {arrivee?.nom ?? '—'}
      </p>
      <Link to="/configurer" className="rounded-full bg-ocean-600 px-5 py-3 font-semibold text-white">
        Configurer mon voyage →
      </Link>
      <MentionDonnees />
    </main>
  )
}
