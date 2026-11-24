import { Baby, ChevronDown, Plus, Trash2, UserRound } from 'lucide-react'
import { useId, useState } from 'react'
import type { PosteDepense, ProfilPaiement, TypeVoyageur, Voyageur } from '../domain/types'
import { NOMS_POSTES, POSTES_DEPENSE, nomVoyageur } from '../engine/repartition'
import { AvatarVoyageur } from '../ui/AvatarVoyageur'
import { formatEuros } from '../ui/format'
import { Compteur, Puces, Segments } from './Controles'

export const PROFILS: { valeur: ProfilPaiement; libelle: string; titre: string }[] = [
  { valeur: 'part', libelle: 'Sa part', titre: 'Paie sa part (et celle de ceux qui ne paient pas)' },
  { valeur: 'rien', libelle: 'Rien', titre: 'Ne paie rien' },
  { valeur: 'postes', libelle: 'Postes', titre: 'Paie certains postes' },
  { valeur: 'fixe', libelle: 'Fixe', titre: 'Donne un montant fixe' },
  { valeur: 'pourcentage', libelle: '%', titre: 'Paie un pourcentage du total' },
]

/** « Paie sa part », « Invité : ne paie rien », « Paie : logement, repas »… */
export function resumeProfil(v: Voyageur): string {
  switch (v.paiement) {
    case 'part':
      return 'Paie sa part'
    case 'rien':
      return v.type === 'adulte' ? 'Invité : ne paie rien' : 'Gratuit : ne paie rien'
    case 'postes':
      return v.postes?.length ? `Paie : ${v.postes.map((p) => NOMS_POSTES[p].toLowerCase()).join(', ')}` : 'Paie certains postes (aucun coché)'
    case 'fixe':
      return `Donne ${formatEuros(v.montant ?? 0)}`
    case 'pourcentage':
      return `Paie ${v.pourcentage ?? 0} % du total`
  }
}

const LIBELLES_TYPE: Record<TypeVoyageur, string> = { adulte: 'Adulte', enfant: 'Enfant', bebe: 'Bébé' }
const champ = 'h-11 w-full min-w-0 rounded-2xl bg-white/70 px-3 text-base ring-1 ring-slate-900/10 focus:ring-2 focus:ring-ocean-500 focus:outline-none dark:bg-white/8 dark:ring-white/12'

function CarteVoyageur({ v, index, tous, ouvert, onOuvrir, onChange, onSupprimer, avance, montant }: { v: Voyageur; index: number; tous: Voyageur[]; ouvert: boolean; onOuvrir: () => void; onChange: (v: Voyageur) => void; onSupprimer?: () => void; avance: boolean; montant?: number }) {
  const id = useId()
  const nom = nomVoyageur(v, tous)
  const maj = (c: Partial<Voyageur>) => onChange({ ...v, ...c })
  return (
    <li className="verre overflow-hidden rounded-[1.5rem] [--verre-fond:0.7] dark:[--verre-fond:0.45]">
      <button type="button" onClick={onOuvrir} aria-expanded={ouvert} aria-controls={id} className="flex w-full items-center gap-3 p-2.5 pr-3 text-left">
        <AvatarVoyageur nom={nom} index={index} taille={40} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{nom}</span>
            {v.type !== 'adulte' && <span className="shrink-0 rounded-full bg-slate-900/6 px-1.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{LIBELLES_TYPE[v.type]}{v.age != null ? `, ${v.age} an${v.age > 1 ? 's' : ''}` : ''}</span>}
          </span>
          <span className="block truncate text-xs text-slate-600 dark:text-slate-300">{resumeProfil(v)}</span>
        </span>
        {montant != null && <span className="shrink-0 text-sm font-bold tabular-nums">{formatEuros(montant)}</span>}
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition ${ouvert ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {ouvert && (
        <div id={id} className="space-y-3 border-t border-slate-900/5 px-3 pt-3 pb-3.5 dark:border-white/10">
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300">
              Prénom (facultatif)
              <input className={`${champ} mt-1`} value={v.prenom ?? ''} placeholder={nomVoyageur({ ...v, prenom: '' }, tous)} maxLength={24} autoComplete="off" onChange={(e) => maj({ prenom: e.target.value })} />
            </label>
            {v.type !== 'adulte' && (
              <label className="w-20 text-xs font-medium text-slate-600 dark:text-slate-300">
                Âge
                <input className={`${champ} mt-1 text-center`} type="number" inputMode="numeric" min={0} max={v.type === 'bebe' ? 1 : 17} value={v.age ?? ''} onChange={(e) => maj({ age: e.target.value === '' ? undefined : Math.max(0, Math.min(17, Number(e.target.value))) })} />
              </label>
            )}
          </div>
          <Segments<TypeVoyageur>
            nom={`Type de ${nom}`}
            compact
            valeur={v.type}
            onChange={(type) => maj({ type, age: type === 'adulte' ? undefined : type === 'bebe' ? 1 : (v.age ?? 8), paiement: type === 'adulte' ? (v.paiement === 'rien' ? 'part' : v.paiement) : v.paiement })}
            options={[
              { valeur: 'adulte', libelle: 'Adulte' },
              { valeur: 'enfant', libelle: 'Enfant', titre: '2 à 17 ans' },
              { valeur: 'bebe', libelle: 'Bébé', titre: 'Moins de 2 ans : gratuit en logement et en train' },
            ]}
          />
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">Ce qu’il ou elle paie</p>
            <Segments<ProfilPaiement> nom={`Paiement de ${nom}`} compact colonnes="grid-cols-5" valeur={v.paiement} onChange={(paiement) => maj({ paiement, ...(paiement === 'postes' && !v.postes?.length ? { postes: ['logement', 'repas'] } : {}) })} options={PROFILS} />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{PROFILS.find((p) => p.valeur === v.paiement)!.titre}</p>
          </div>
          {v.paiement === 'postes' && <Puces<PosteDepense> nom={`Postes payés par ${nom}`} valeurs={v.postes ?? []} onChange={(postes) => maj({ postes })} options={POSTES_DEPENSE.map((p) => ({ valeur: p, libelle: NOMS_POSTES[p] }))} />}
          {v.paiement === 'fixe' && (
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Montant total (€)
              <input className={`${champ} mt-1`} type="number" inputMode="decimal" min={0} step={10} value={v.montant ?? ''} onChange={(e) => maj({ montant: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })} />
            </label>
          )}
          {v.paiement === 'pourcentage' && (
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Part du total (%)
              <input className={`${champ} mt-1`} type="number" inputMode="decimal" min={0} max={100} step={5} value={v.pourcentage ?? ''} onChange={(e) => maj({ pourcentage: e.target.value === '' ? undefined : Math.max(0, Math.min(100, Number(e.target.value))) })} />
            </label>
          )}
          {avance && v.paiement === 'part' && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Poids dans le partage
                <span className="block text-slate-500 dark:text-slate-400">2 = reprend deux fois plus de la part des autres</span>
              </p>
              <Compteur libelle={`Poids de ${nom}`} valeur={v.poids ?? 1} min={1} max={5} onChange={(poids) => maj({ poids })} />
            </div>
          )}
          {onSupprimer && (
            <button type="button" onClick={onSupprimer} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300">
              <Trash2 className="size-3.5" aria-hidden /> Retirer {nom}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Les voyageurs, en cartes de verre : prénom, type (adulte, enfant, bébé) et profil de paiement.
 * `montants` : ce que paie chacun, affiché en direct.
 */
export function EditeurVoyageurs({ voyageurs, onChange, avance = false, montants }: { voyageurs: Voyageur[]; onChange: (l: Voyageur[]) => void; avance?: boolean; montants?: Map<string, number> }) {
  const [ouvert, setOuvert] = useState<string | null>(null)
  const adultes = voyageurs.filter((v) => v.type === 'adulte').length
  const ajouter = (type: TypeVoyageur) => {
    const pris = new Set(voyageurs.map((v) => v.id))
    let k = 1
    while (pris.has(`${type}-${k}`)) k++
    const nouveau: Voyageur = { id: `${type}-${k}`, type, paiement: type === 'adulte' ? 'part' : 'rien', ...(type === 'enfant' ? { age: 8 } : type === 'bebe' ? { age: 1 } : {}) }
    // Les adultes d'abord, puis les enfants, puis les bébés
    const rang = (t: TypeVoyageur) => ['adulte', 'enfant', 'bebe'].indexOf(t)
    onChange([...voyageurs, nouveau].sort((a, b) => rang(a.type) - rang(b.type)))
    setOuvert(nouveau.id)
  }
  return (
    <div className="space-y-2.5">
      <ul className="space-y-2">
        {voyageurs.map((v, i) => (
          <CarteVoyageur
            key={v.id}
            v={v}
            index={i}
            tous={voyageurs}
            ouvert={ouvert === v.id}
            onOuvrir={() => setOuvert(ouvert === v.id ? null : v.id)}
            onChange={(nv) => onChange(voyageurs.map((x) => (x.id === v.id ? nv : x)))}
            onSupprimer={v.type !== 'adulte' || adultes > 1 ? () => onChange(voyageurs.filter((x) => x.id !== v.id)) : undefined}
            avance={avance}
            montant={montants?.get(v.id)}
          />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {([
          ['adulte', 'Adulte', UserRound],
          ['enfant', 'Enfant', UserRound],
          ['bebe', 'Bébé', Baby],
        ] as const).map(([type, libelle, Icone]) => (
          <button key={type} type="button" disabled={voyageurs.length >= 16} onClick={() => ajouter(type)} className="eclat inline-flex h-10 items-center gap-1.5 rounded-full bg-white/70 px-3.5 text-sm font-semibold text-ocean-800 ring-1 ring-slate-900/10 hover:ring-ocean-400 disabled:opacity-40 dark:bg-white/8 dark:text-ocean-100 dark:ring-white/12">
            <Plus className="size-4" aria-hidden />
            <Icone className="size-4" aria-hidden /> {libelle}
          </button>
        ))}
      </div>
    </div>
  )
}
