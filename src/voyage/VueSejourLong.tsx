import { CalendarClock, Info, Ticket } from 'lucide-react'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { LOGEMENTS_UI } from '../config/libelles'
import type { Itineraire, Lieu } from '../domain/types'
import type { ElementChecklist, LienReservation } from '../engine/liens'
import { liensActivite } from '../engine/liens'
import { budgetSejourLong, POSTES_MENSUELS, type BudgetSejourLong, type EntreeSejourLong, type PosteMensuel } from '../engine/sejourLong'
import { BoutonFavori } from '../ui/BoutonFavori'
import { formatEuros } from '../ui/format'
import { OngletReservations } from './OngletReservations'
import { TYPES_ACTIVITE_UI } from './libelles'

const CarteZones = lazy(() => import('./CarteZones'))

const POSTES: Record<PosteMensuel, { libelle: string; couleur: string }> = {
  loyer: { libelle: 'Loyer', couleur: 'var(--poste-logement)' },
  trajets: { libelle: 'Trajets domicile-travail', couleur: 'var(--poste-transport-local)' },
  courses: { libelle: 'Courses', couleur: 'var(--poste-repas)' },
  sorties: { libelle: 'Sorties', couleur: 'var(--poste-activites)' },
  retours: { libelle: 'Retours le week-end', couleur: 'var(--poste-transport)' },
  divers: { libelle: 'Divers et imprévus', couleur: 'var(--poste-divers)' },
}

const ONGLETS = [
  { id: 'budget', libelle: 'Budget' },
  { id: 'zones', libelle: 'Zones' },
  { id: 'weekends', libelle: 'Week-ends' },
  { id: 'reservations', libelle: 'Logement' },
] as const
type Onglet = (typeof ONGLETS)[number]['id']

const carte = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10'

function BudgetMensuel({ b, entree }: { b: BudgetSejourLong; entree: EntreeSejourLong }) {
  const max = Math.max(...POSTES_MENSUELS.map((p) => b.parMois[p]))
  // Même logement, autres zones : ce que change la distance au travail
  const parZone = useMemo(() => b.zones.map((z) => ({ z, b: budgetSejourLong({ ...entree, logement: b.logement, zone: z.id }) })), [b, entree])
  return (
    <div className="space-y-4">
      <section className={carte} aria-labelledby="titre-mois">
        <h3 id="titre-mois" className="flex items-baseline justify-between gap-2 font-semibold">
          Chaque mois <span className="text-xl tabular-nums">{formatEuros(b.totalMensuel)}</span>
        </h3>
        <ul className="mt-3 space-y-3">
          {POSTES_MENSUELS.map((p) => (
            <li key={p}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{POSTES[p].libelle}</span>
                <span className="font-semibold tabular-nums">{formatEuros(b.parMois[p])}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-900/5 dark:bg-white/10" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${max ? (b.parMois[p] / max) * 100 : 0}%`, background: POSTES[p].couleur }} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{b.details[p].map((d) => d.libelle).join(' · ')}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={carte} aria-labelledby="titre-total">
        <h3 id="titre-total" className="font-semibold">
          Tout le séjour
        </h3>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt>
              {b.mois.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} mois × {formatEuros(b.totalMensuel)}
            </dt>
            <dd className="font-semibold tabular-nums">{formatEuros(b.totalMensuel * b.mois)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Voyage aller-retour</dt>
            <dd className="font-semibold tabular-nums">{formatEuros(b.ponctuel.voyage)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Installation (dossier, assurance habitation)</dt>
            <dd className="font-semibold tabular-nums">{formatEuros(b.ponctuel.installation)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-slate-900/10 pt-1.5 text-base dark:border-white/10">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold tabular-nums">{formatEuros(b.total)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Le dépôt de garantie (souvent un mois de loyer) n’est pas compté : il vous est rendu à la fin.</p>
      </section>

      <section className={carte} aria-labelledby="titre-zones-cout">
        <h3 id="titre-zones-cout" className="font-semibold">
          {LOGEMENTS_UI[b.logement].libelle} : selon la zone
        </h3>
        <div className="-mx-4 mt-2 overflow-x-auto px-4">
          <table className="w-full min-w-[20rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                <th className="py-1 font-medium">Zone</th>
                <th className="py-1 pl-3 text-right font-medium">Loyer</th>
                <th className="py-1 pl-3 text-right font-medium">Trajets</th>
                <th className="py-1 pl-3 text-right font-medium">Par mois</th>
              </tr>
            </thead>
            <tbody>
              {parZone.map(({ z, b: bz }) => (
                <tr key={z.id} className={`border-t border-slate-900/5 dark:border-white/10 ${z.id === b.zone.id ? 'font-semibold' : ''}`}>
                  <td className="py-1.5">
                    {z.nom} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">≤ {z.minutes} min</span>
                  </td>
                  <td className="py-1.5 pl-3 text-right whitespace-nowrap tabular-nums">{formatEuros(bz.parMois.loyer)}</td>
                  <td className="py-1.5 pl-3 text-right whitespace-nowrap tabular-nums">{formatEuros(bz.parMois.trajets)}</td>
                  <td className="py-1.5 pl-3 text-right whitespace-nowrap tabular-nums">{formatEuros(bz.totalMensuel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Weekends({ itineraire, ville, actives }: { itineraire: Itineraire; ville: string; actives: boolean }) {
  const activites = itineraire.jours.flatMap((j) => j.activites).slice(0, 10)
  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-2xl bg-slate-900/5 px-3 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
        <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
        {actives ? 'Des idées pour vos week-ends, à piocher librement : elles sont comprises dans le poste « Sorties ».' : 'Activités désactivées dans les réglages : voici quand même quelques idées, non comptées dans le budget.'}
      </p>
      {itineraire.source !== 'osm' && (
        <p className="flex items-start gap-2 rounded-2xl bg-(--statut-juste)/15 px-3 py-2 text-sm text-(--statut-juste-texte)">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Peu de lieux précis trouvés autour : ce sont des idées types, à compléter sur place.
        </p>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {activites.map(({ lieu, prix }) => {
          const liens = liensActivite(lieu, ville)
          return (
            <li key={lieu.id} className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
              <a href={liens.infos} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{lieu.nom}</span>
                <span className="block text-sm text-slate-500 dark:text-slate-400">
                  {TYPES_ACTIVITE_UI[lieu.type]} · {prix === 0 ? 'gratuit' : `≈ ${formatEuros(prix)}`}
                </span>
              </a>
              {liens.reserver && (
                <a href={liens.reserver} target="_blank" rel="noopener noreferrer" className="grid size-10 shrink-0 place-items-center rounded-full text-ocean-700 ring-1 ring-ocean-600/40 dark:text-ocean-200" aria-label={`Réserver ${lieu.nom}`}>
                  <Ticket className="size-4" />
                </a>
              )}
              <BoutonFavori favori={{ id: `activite:${lieu.id}`, type: 'activite', nom: lieu.nom, detail: `${TYPES_ACTIVITE_UI[lieu.type]} · ${ville}`, lieu: { lat: lieu.lat, lon: lieu.lon }, ville, lien: liens.infos }} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** « Mon voyage » d'un stage ou séjour long : budget par mois, zones de logement, week-ends, liens. */
export function VueSejourLong(props: {
  budget: BudgetSejourLong
  entree: EntreeSejourLong
  arrivee: Lieu
  itineraire: Itineraire
  activitesWeekend: boolean
  liens: LienReservation[]
  checklist: ElementChecklist[]
  coche: (id: string) => boolean
  onCocher: (id: string) => void
}) {
  const [onglet, setOnglet] = useState<Onglet>('budget')
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <>
      <div role="tablist" aria-label="Sections du séjour" className="grid grid-cols-4 rounded-2xl bg-slate-900/5 p-1 print:hidden dark:bg-white/10">
        {ONGLETS.map((o, i) => (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`onglet-${o.id}`}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            aria-controls={`panneau-${o.id}`}
            tabIndex={onglet === o.id ? 0 : -1}
            onClick={() => setOnglet(o.id)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              const j = (i + (e.key === 'ArrowRight' ? 1 : ONGLETS.length - 1)) % ONGLETS.length
              setOnglet(ONGLETS[j].id)
              refs.current[j]?.focus()
            }}
            className={`h-10 rounded-xl text-xs font-semibold transition sm:text-sm ${onglet === o.id ? 'bg-white text-ocean-800 shadow-sm dark:bg-ocean-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {o.libelle}
          </button>
        ))}
      </div>
      <div id={`panneau-${onglet}`} role="tabpanel" aria-labelledby={`onglet-${onglet}`} className="print:hidden">
        {onglet === 'budget' && <BudgetMensuel b={props.budget} entree={props.entree} />}
        {onglet === 'zones' && (
          <Suspense fallback={<div className="grid h-64 place-items-center text-slate-500">Chargement…</div>}>
            <CarteZones arrivee={props.arrivee} zones={props.budget.zones} choisie={props.budget.zone.id} />
          </Suspense>
        )}
        {onglet === 'weekends' && <Weekends itineraire={props.itineraire} ville={props.arrivee.nom} actives={props.activitesWeekend} />}
        {onglet === 'reservations' && <OngletReservations liens={props.liens} checklist={props.checklist} coche={props.coche} onCocher={props.onCocher} />}
      </div>
      <div className="hidden print:block">
        <BudgetMensuel b={props.budget} entree={props.entree} />
      </div>
    </>
  )
}
