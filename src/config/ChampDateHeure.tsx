import { CalendarDays, Clock } from 'lucide-react'

/**
 * Champ date ou heure : le texte est affiché en français (« 30 mars 2027 », « 9 h 00 »),
 * et le sélecteur natif, invisible, couvre tout le champ. On évite ainsi la langue imposée
 * par certains iPhone (« 24 Dec 2026 ») et la largeur minimale des champs date d'iOS,
 * qui faisait déborder le champ de droite.
 */
export function ChampDateHeure({
  id,
  type,
  valeur,
  min,
  onChange,
}: {
  id: string
  type: 'date' | 'time'
  valeur: string
  min?: string
  onChange: (v: string) => void
}) {
  const texte =
    type === 'date'
      ? new Date(`${valeur}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      : valeur.replace(/^0?(\d+):(\d{2})$/, '$1 h $2')
  const Icone = type === 'date' ? CalendarDays : Clock
  return (
    <div className="relative min-w-0">
      <input
        id={id}
        type={type}
        value={valeur}
        min={min}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        // Sur ordinateur, un clic n'importe où ouvre le sélecteur (sur iPhone, c'est automatique)
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            /* navigateur sans showPicker : le sélecteur natif s'ouvre quand même au toucher */
          }
        }}
        className="peer absolute inset-0 z-10 h-full w-full min-w-0 cursor-pointer appearance-none opacity-0"
      />
      <div
        aria-hidden
        className="flex h-12 w-full min-w-0 items-center gap-2 rounded-2xl bg-slate-50 px-3 ring-1 ring-slate-900/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ocean-500 dark:bg-white/5 dark:ring-white/10"
      >
        <Icone className="size-4 shrink-0 text-ocean-700 dark:text-ocean-300" />
        <span className="truncate text-base">{texte}</span>
      </div>
    </div>
  )
}
