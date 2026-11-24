import { CalendarDays, CheckCircle2, Circle, FilePen, Luggage, MapPinned, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MODES_UI, TYPES_VOYAGE_UI } from '../config/libelles'
import { ajouterJours } from '../engine/dates'
import { dateDuJour, useVoyage, type VoyageSauvegarde } from '../store/voyage'
import { formatEuros } from '../ui/format'
import { EnTetePage } from '../ui/EnTetePage'
import { Montant, PisteLiquide, classeOnglet, FOND_PISTE } from '../ui/glass'

const date = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export type RubriqueVoyages = 'brouillons' | 'a-reserver' | 'reserves' | 'passes'

/** Range un voyage : brouillon (jamais calculé), passé (retour avant aujourd'hui), réservé ou à réserver. */
export function rubriqueDe(v: VoyageSauvegarde, aujourdhui = dateDuJour()): RubriqueVoyages {
  if (v.statut === 'brouillon') return 'brouillons'
  const s = v.reglages.simple
  if (ajouterJours(s.dateDepart, s.nuits) < aujourdhui) return 'passes'
  return v.reserve ? 'reserves' : 'a-reserver'
}

const RUBRIQUES: { id: RubriqueVoyages; libelle: string; vide: string; pastille: string }[] = [
  { id: 'brouillons', libelle: 'Brouillons', vide: 'Un voyage configuré mais pas encore calculé apparaît ici automatiquement.', pastille: 'bg-[#ff9f43]' },
  { id: 'a-reserver', libelle: 'À réserver', vide: 'Calculez un voyage puis touchez « Sauvegarder » pour le retrouver ici.', pastille: 'bg-[#6aa8ff]' },
  { id: 'reserves', libelle: 'Réservés', vide: 'Touchez « Marquer réservé » sur un voyage une fois vos réservations faites.', pastille: 'bg-[#2fd08a]' },
  { id: 'passes', libelle: 'Passés', vide: 'Vos voyages terminés apparaîtront ici.', pastille: 'bg-slate-400' },
]

function CarteVoyage({ v, onOuvrir, onSupprimer, onReserve }: { v: VoyageSauvegarde; onOuvrir: () => void; onSupprimer: () => void; onReserve?: (r: boolean) => void }) {
  const s = v.reglages.simple
  const Icone = MODES_UI[s.transport].icone
  const type = TYPES_VOYAGE_UI[s.typeVoyage]
  return (
    <li className="reflet flex flex-col overflow-hidden rounded-3xl bg-white/90 shadow-[0_10px_28px_-16px_rgb(15_40_90/0.45)] ring-1 ring-slate-900/5 transition-transform duration-200 hover:-translate-y-[5px] dark:bg-[#0e1f45]/90 dark:ring-white/10">
      <div className="flex items-stretch">
        <button type="button" onClick={onOuvrir} className="relative z-10 min-w-0 flex-1 p-4 text-left">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{v.nom}</span>
            {v.statut === 'brouillon' && <span className="shrink-0 rounded-full bg-corail-300/40 px-2 py-0.5 text-[11px] font-semibold text-corail-700 dark:bg-corail-700/40 dark:text-corail-300">Brouillon</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-600 dark:text-slate-300">
            <Icone className="size-4 shrink-0" aria-hidden /> {v.depart.nom} → {v.arrivee.nom}
          </span>
          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <type.icone className="size-3.5" aria-hidden /> {type.nom}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {s.typeVoyage === 'flexible' ? `${s.flexible.dureeMin} à ${s.flexible.dureeMax} nuits` : `${date(s.dateDepart)} → ${date(ajouterJours(s.dateDepart, s.nuits))}`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden /> {s.adultes + s.enfants}
            </span>
            {v.total != null && <span className="font-semibold text-slate-700 dark:text-slate-200">≈ {formatEuros(v.total)}</span>}
          </span>
          {v.proposition && <span className="mt-1 block truncate text-xs text-ocean-700 dark:text-ocean-300">{v.proposition}</span>}
        </button>
        <button type="button" onClick={onSupprimer} className="relative z-10 grid w-12 shrink-0 place-items-center text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" aria-label={`Supprimer « ${v.nom} »`}>
          <Trash2 className="size-5" />
        </button>
      </div>
      {onReserve && (
        <button
          type="button"
          onClick={() => onReserve(!v.reserve)}
          aria-pressed={!!v.reserve}
          className={`relative z-10 mx-3 mb-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-semibold ring-1 transition ${v.reserve ? 'bg-(--statut-ok)/12 text-(--statut-ok-texte) ring-(--statut-ok)/30' : 'text-ocean-800 ring-ocean-700/25 hover:bg-ocean-50 dark:text-ocean-100 dark:ring-white/15 dark:hover:bg-white/8'}`}
        >
          {v.reserve ? <CheckCircle2 className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
          {v.reserve ? 'Réservé' : 'Marquer réservé'}
        </button>
      )}
    </li>
  )
}

export default function MesVoyages() {
  const navigate = useNavigate()
  const { sauvegardes, ouvrirSauvegarde, supprimerSauvegarde, nouveauVoyage, marquerReserve } = useVoyage()
  const aujourdhui = dateDuJour()
  const parRubrique = (id: RubriqueVoyages) => {
    const l = sauvegardes.filter((v) => rubriqueDe(v, aujourdhui) === id)
    // Les voyages à venir, du plus proche au plus lointain ; les autres, du plus récent au plus ancien
    if (id === 'a-reserver' || id === 'reserves') l.sort((a, b) => a.reglages.simple.dateDepart.localeCompare(b.reglages.simple.dateDepart))
    return l
  }
  const [rubrique, setRubrique] = useState<RubriqueVoyages>(() => RUBRIQUES.find((r) => parRubrique(r.id).length > 0)?.id ?? 'a-reserver')
  const aVenir = [...parRubrique('a-reserver'), ...parRubrique('reserves')]
  const budgetAVenir = aVenir.reduce((t, v) => t + (v.total ?? 0), 0)

  function preparer() {
    nouveauVoyage()
    navigate('/')
  }

  const carte = (v: VoyageSauvegarde) => (
    <CarteVoyage
      key={v.id}
      v={v}
      onOuvrir={() => {
        ouvrirSauvegarde(v.id)
        navigate(v.statut === 'brouillon' ? '/configurer' : '/calcul?vers=voyage')
      }}
      onSupprimer={() => {
        if (window.confirm(`Supprimer « ${v.nom} » ?`)) supprimerSauvegarde(v.id)
      }}
      onReserve={rubriqueDe(v, aujourdhui) === 'a-reserver' || rubriqueDe(v, aujourdhui) === 'reserves' ? (r) => marquerReserve(v.id, r) : undefined}
    />
  )

  const vide = (id: RubriqueVoyages, grand: boolean) => (
    <div className={grand ? 'mt-14 text-center' : 'rounded-3xl border border-dashed border-slate-900/10 p-4 text-center text-xs text-slate-500 dark:border-white/15 dark:text-slate-400'}>
      {grand ? (
        <>
          {id === 'brouillons' ? <FilePen className="mx-auto size-10 text-ocean-600" aria-hidden /> : <Luggage className="mx-auto size-10 text-ocean-600" aria-hidden />}
          <h2 className="mt-3 text-lg font-semibold">Rien pour l’instant</h2>
          <p className="mx-auto mt-1 max-w-xs text-slate-600 dark:text-slate-300">{RUBRIQUES.find((r) => r.id === id)!.vide}</p>
          <button type="button" onClick={preparer} className="bouton-accent mt-5 inline-flex h-12 items-center gap-2 rounded-2xl px-5 font-semibold">
            <MapPinned className="size-5" aria-hidden /> Préparer un voyage
          </button>
        </>
      ) : (
        RUBRIQUES.find((r) => r.id === id)!.vide
      )}
    </div>
  )

  return (
    <div className="min-h-dvh">
      <EnTetePage titre="Mes voyages">
        <button type="button" onClick={preparer} className="bouton-accent ml-auto flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold">
          <Plus className="size-4" aria-hidden /> Nouveau
        </button>
      </EnTetePage>
      <main className="mx-auto max-w-2xl px-3 py-4 lg:max-w-6xl lg:px-6">
        {/* Total des voyages à venir, dans une carte de verre sombre (référence « Deal Pipeline ») */}
        {aVenir.length > 0 && (
          <div className="verre-sombre reflet mb-4 flex items-end justify-between gap-3 rounded-3xl p-4">
            <p>
              <span className="block text-xs text-white/75">Budget des voyages à venir</span>
              <Montant valeur={budgetAVenir} className="text-3xl" />
            </p>
            <p className="text-right text-xs text-white/75">
              {aVenir.length} voyage{aVenir.length > 1 ? 's' : ''}
              <span className="block">
                {parRubrique('reserves').length} réservé{parRubrique('reserves').length > 1 ? 's' : ''}
              </span>
            </p>
          </div>
        )}

        {/* Mobile : onglets */}
        <div className="lg:hidden">
          <PisteLiquide cle={rubrique} role="tablist" aria-label="Rubriques" className={`grid grid-cols-4 ${FOND_PISTE}`}>
            {RUBRIQUES.map((r) => {
              const n = parRubrique(r.id).length
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={rubrique === r.id}
                  data-actif={rubrique === r.id}
                  onClick={() => setRubrique(r.id)}
                  className={`flex h-11 flex-col items-center justify-center rounded-xl text-[12px] leading-tight font-semibold ${classeOnglet(rubrique === r.id)}`}
                >
                  {r.libelle}
                  <span className="text-[10px] font-normal opacity-70">{n}</span>
                </button>
              )
            })}
          </PisteLiquide>
          {parRubrique(rubrique).length === 0 ? vide(rubrique, true) : <ul className="mt-4 space-y-3">{parRubrique(rubrique).map(carte)}</ul>}
        </div>

        {/* Ordinateur : colonnes */}
        <div className="hidden gap-4 lg:grid lg:grid-cols-4">
          {RUBRIQUES.map((r) => {
            const l = parRubrique(r.id)
            return (
              <section key={r.id} aria-label={r.libelle} className="verre min-w-0 rounded-[1.75rem] p-3 [--verre-fond:0.45] dark:[--verre-fond:0.35]">
                <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold">
                  <span className={`size-2.5 rounded-full ${r.pastille}`} aria-hidden />
                  {r.libelle}
                  <span className="ml-auto rounded-full bg-slate-900/5 px-2 text-xs font-medium tabular-nums dark:bg-white/10">{l.length}</span>
                </h2>
                {l.length === 0 ? vide(r.id, false) : <ul className="space-y-3">{l.map(carte)}</ul>}
              </section>
            )
          })}
        </div>
        {sauvegardes.length === 0 && <div className="hidden lg:block">{vide('a-reserver', true)}</div>}
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">Vos voyages restent sur cet appareil. Connectez-vous dans l’onglet Compte pour les retrouver partout.</p>
      </main>
    </div>
  )
}
