import { CalendarDays, FilePen, Luggage, MapPinned, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MODES_UI, TYPES_VOYAGE_UI } from '../config/libelles'
import { ajouterJours } from '../engine/dates'
import { dateDuJour, useVoyage, type VoyageSauvegarde } from '../store/voyage'
import { formatEuros } from '../ui/format'
import { EnTetePage } from '../ui/EnTetePage'

const date = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export type RubriqueVoyages = 'a-venir' | 'brouillons' | 'passes'

/** Range un voyage : brouillon (jamais calculé), passé (retour avant aujourd'hui) ou à venir. */
export function rubriqueDe(v: VoyageSauvegarde, aujourdhui = dateDuJour()): RubriqueVoyages {
  if (v.statut === 'brouillon') return 'brouillons'
  const s = v.reglages.simple
  return ajouterJours(s.dateDepart, s.nuits) < aujourdhui ? 'passes' : 'a-venir'
}

const RUBRIQUES: { id: RubriqueVoyages; libelle: string; vide: string }[] = [
  { id: 'a-venir', libelle: 'À venir', vide: 'Calculez un voyage puis touchez « Sauvegarder » pour le retrouver ici.' },
  { id: 'brouillons', libelle: 'Brouillons', vide: 'Un voyage configuré mais pas encore calculé apparaît ici automatiquement.' },
  { id: 'passes', libelle: 'Passés', vide: 'Vos voyages terminés apparaîtront ici.' },
]

function CarteVoyage({ v, onOuvrir, onSupprimer }: { v: VoyageSauvegarde; onOuvrir: () => void; onSupprimer: () => void }) {
  const s = v.reglages.simple
  const Icone = MODES_UI[s.transport].icone
  const type = TYPES_VOYAGE_UI[s.typeVoyage]
  return (
    <li className="flex items-stretch overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-[#0e1f45] dark:ring-white/10">
      <button type="button" onClick={onOuvrir} className="min-w-0 flex-1 p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5">
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
      <button type="button" onClick={onSupprimer} className="grid w-14 shrink-0 place-items-center text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" aria-label={`Supprimer « ${v.nom} »`}>
        <Trash2 className="size-5" />
      </button>
    </li>
  )
}

export default function MesVoyages() {
  const navigate = useNavigate()
  const { sauvegardes, ouvrirSauvegarde, supprimerSauvegarde, nouveauVoyage } = useVoyage()
  const aujourdhui = dateDuJour()
  const parRubrique = (id: RubriqueVoyages) => sauvegardes.filter((v) => rubriqueDe(v, aujourdhui) === id)
  const [rubrique, setRubrique] = useState<RubriqueVoyages>(() => (parRubrique('a-venir').length || !parRubrique('brouillons').length ? 'a-venir' : 'brouillons'))
  const liste = parRubrique(rubrique)
  // Les voyages à venir, du plus proche au plus lointain ; les autres, du plus récent au plus ancien
  if (rubrique === 'a-venir') liste.sort((a, b) => a.reglages.simple.dateDepart.localeCompare(b.reglages.simple.dateDepart))

  function preparer() {
    nouveauVoyage()
    navigate('/')
  }

  return (
    <div className="min-h-dvh">
      <EnTetePage titre="Mes voyages">
        <button type="button" onClick={preparer} className="ml-auto flex h-10 items-center gap-1.5 rounded-full bg-ocean-700 px-4 text-sm font-semibold text-white hover:bg-ocean-800">
          <Plus className="size-4" aria-hidden /> Nouveau
        </button>
      </EnTetePage>
      <main className="mx-auto max-w-2xl px-3 py-4">
        <div role="tablist" aria-label="Rubriques" className="grid grid-cols-3 rounded-2xl bg-slate-900/5 p-1 dark:bg-white/10">
          {RUBRIQUES.map((r) => {
            const n = parRubrique(r.id).length
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={rubrique === r.id}
                onClick={() => setRubrique(r.id)}
                className={`h-10 rounded-xl text-sm font-semibold transition ${rubrique === r.id ? 'bg-white text-ocean-800 shadow-sm dark:bg-ocean-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
              >
                {r.libelle}
                {n > 0 && <span className="ml-1 text-xs font-normal opacity-75">{n}</span>}
              </button>
            )
          })}
        </div>

        {liste.length === 0 ? (
          <div className="mt-14 text-center">
            {rubrique === 'brouillons' ? <FilePen className="mx-auto size-10 text-ocean-600" aria-hidden /> : <Luggage className="mx-auto size-10 text-ocean-600" aria-hidden />}
            <h2 className="mt-3 text-lg font-semibold">Rien pour l’instant</h2>
            <p className="mx-auto mt-1 max-w-xs text-slate-600 dark:text-slate-300">{RUBRIQUES.find((r) => r.id === rubrique)!.vide}</p>
            <button type="button" onClick={preparer} className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-ocean-700 px-5 font-semibold text-white">
              <MapPinned className="size-5" aria-hidden /> Préparer un voyage
            </button>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {liste.map((v) => (
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
              />
            ))}
          </ul>
        )}
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">Vos voyages restent sur cet appareil. Connectez-vous dans l’onglet Compte pour les retrouver partout.</p>
      </main>
    </div>
  )
}
