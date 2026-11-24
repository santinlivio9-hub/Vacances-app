import { ArrowLeft, Bookmark, CalendarDays, MapPinned, Trash2, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { ajouterJours } from '../engine/dates'
import { useVoyage } from '../store/voyage'
import { MODES_UI } from '../config/libelles'

const date = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export default function MesVoyages() {
  const navigate = useNavigate()
  const { sauvegardes, ouvrirSauvegarde, supprimerSauvegarde } = useVoyage()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-900/5 bg-ocean-50/90 backdrop-blur dark:border-white/10 dark:bg-ocean-950/90">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2">
          <Link to="/" className="grid size-11 place-items-center rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10" aria-label="Retour à la carte">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-semibold">Mes voyages</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-3 py-4">
        {sauvegardes.length === 0 ? (
          <div className="mt-16 text-center">
            <Bookmark className="mx-auto size-10 text-ocean-600" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">Aucun voyage sauvegardé</h2>
            <p className="mx-auto mt-1 max-w-xs text-slate-600 dark:text-slate-300">Calculez un voyage puis touchez « Sauvegarder » pour le retrouver ici. Ils restent sur cet appareil.</p>
            <Link to="/" className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-ocean-700 px-5 font-semibold text-white">
              <MapPinned className="size-5" aria-hidden /> Préparer un voyage
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              {sauvegardes.length} voyage{sauvegardes.length > 1 ? 's' : ''}, enregistré{sauvegardes.length > 1 ? 's' : ''} sur cet appareil.
            </p>
            <ul className="space-y-3">
              {sauvegardes.map((v) => {
                const s = v.reglages.simple
                const Icone = MODES_UI[s.transport].icone
                return (
                  <li key={v.id} className="flex items-stretch overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        ouvrirSauvegarde(v.id)
                        navigate('/calcul')
                      }}
                      className="min-w-0 flex-1 p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <span className="block truncate font-semibold">{v.nom}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-600 dark:text-slate-300">
                        <Icone className="size-4 shrink-0" aria-hidden /> {v.depart.nom} → {v.arrivee.nom}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" aria-hidden /> {date(s.dateDepart)} → {date(ajouterJours(s.dateDepart, s.nuits))}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" aria-hidden /> {s.adultes + s.enfants}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Supprimer « ${v.nom} » ?`)) supprimerSauvegarde(v.id)
                      }}
                      className="grid w-14 shrink-0 place-items-center text-slate-500 hover:bg-(--statut-depasse)/10 hover:text-(--statut-depasse-texte)"
                      aria-label={`Supprimer ${v.nom}`}
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}
