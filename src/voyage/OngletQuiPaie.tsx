import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { EditeurVoyageurs } from '../config/EditeurVoyageurs'
import type { PosteDepense, RegleActivite, ReglagesRepartition, ReglagesSimples, Voyageur } from '../domain/types'
import { NOMS_POSTES, POSTES_DEPENSE, nomVoyageur, voyageursDe, type ActiviteRepartie, type PartVoyageur, type ResultatRepartition } from '../engine/repartition'
import { AvatarVoyageur, couleurVoyageur } from '../ui/AvatarVoyageur'
import { formatEuros } from '../ui/format'
import { Montant } from '../ui/glass'

/** Couleur de chaque poste dans la barre de répartition */
export const COULEURS_POSTES: Record<PosteDepense, string> = {
  transport: '#2f6fe0',
  logement: '#9b51e0',
  repas: '#e4872e',
  activites: '#1f9d5a',
  transportLocal: '#0e9aa7',
  divers: '#d6336c',
  imprevus: '#8a94a6',
}

const posteDeLigne = (id: string, activite?: boolean): PosteDepense | null => (activite ? 'activites' : (POSTES_DEPENSE as string[]).includes(id) ? (id as PosteDepense) : null)

/** Donut « qui paie quoi » : une couleur par voyageur, le total au centre. */
export function DonutRepartition({ parts, total, taille = 168 }: { parts: PartVoyageur[]; total: number; taille?: number }) {
  const r = taille / 2 - 14
  const c = 2 * Math.PI * r
  let depart = 0
  const segments = parts
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.montant > 0)
    .map(({ p, i }) => {
      const f = total > 0 ? p.montant / total : 0
      const seg = { id: p.id, couleur: couleurVoyageur(i), longueur: Math.max(0, f * c - 3), decalage: -depart * c }
      depart += f
      return seg
    })
  return (
    <figure className="relative mx-auto grid place-items-center" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} className="-rotate-90" role="img" aria-label={`Répartition : ${parts.map((p) => `${p.nom} ${formatEuros(p.montant)}`).join(', ')}`}>
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={18} />
        {segments.map((s) => (
          <circle key={s.id} cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke={s.couleur} strokeWidth={18} strokeDasharray={`${s.longueur} ${c}`} strokeDashoffset={s.decalage} strokeLinecap="butt" />
        ))}
      </svg>
      <figcaption className="absolute text-center">
        <span className="block text-[11px] text-slate-500 dark:text-slate-400">Total</span>
        <Montant valeur={total} className="text-xl" />
      </figcaption>
    </figure>
  )
}

/** Barre empilée : la part de chaque poste dans ce que paie le voyageur. */
function BarrePostes({ part }: { part: PartVoyageur }) {
  const parPoste = new Map<PosteDepense, number>()
  for (const l of part.lignes) {
    const p = posteDeLigne(l.id, l.activite)
    if (p) parPoste.set(p, (parPoste.get(p) ?? 0) + l.montant)
  }
  const total = [...parPoste.values()].reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  return (
    <div className="mt-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-900/8 dark:bg-white/10" aria-hidden>
        {POSTES_DEPENSE.filter((p) => parPoste.get(p)).map((p) => (
          <span key={p} style={{ width: `${(parPoste.get(p)! / total) * 100}%`, background: COULEURS_POSTES[p] }} />
        ))}
      </div>
      <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
        {POSTES_DEPENSE.filter((p) => parPoste.get(p)).map((p) => (
          <span key={p} className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: COULEURS_POSTES[p] }} aria-hidden />
            {NOMS_POSTES[p]} {formatEuros(parPoste.get(p)!)}
          </span>
        ))}
      </p>
    </div>
  )
}

function CartePart({ part, voyageur, index }: { part: PartVoyageur; voyageur: Voyageur; index: number }) {
  const [ouvert, setOuvert] = useState(false)
  const badge = part.montant === 0 ? (voyageur.type === 'adulte' ? 'Invité' : 'Gratuit') : voyageur.paiement === 'postes' || voyageur.paiement === 'fixe' || voyageur.paiement === 'pourcentage' ? 'Participe' : null
  return (
    <li className="verre reflet rounded-[1.5rem] p-3.5 [--verre-fond:0.8] dark:[--verre-fond:0.6]">
      <div className="flex items-start gap-3">
        <AvatarVoyageur nom={part.nom} index={index} taille={44} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{part.nom}</span>
            {badge && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${part.montant === 0 ? 'bg-(--statut-ok)/15 text-(--statut-ok-texte)' : 'bg-ocean-100 text-ocean-800 dark:bg-ocean-800 dark:text-ocean-100'}`}>{badge}</span>}
          </p>
          <Montant valeur={part.montant} className="block text-3xl leading-tight" />
          <p className="text-xs text-slate-600 dark:text-slate-300">{part.explication}</p>
        </div>
      </div>
      <BarrePostes part={part} />
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className="mt-1.5 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-ocean-700 dark:text-ocean-300">
        <ChevronDown className={`size-3.5 transition ${ouvert ? 'rotate-180' : ''}`} aria-hidden /> Détail
      </button>
      {ouvert && (
        <ul className="mt-1 divide-y divide-slate-900/5 text-sm dark:divide-white/10">
          {part.lignes.map((l) => (
            <li key={l.id} className="flex justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate">{l.libelle}</span>
              <span className="shrink-0 font-medium tabular-nums">{formatEuros(l.montant)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Ce que coûte sa participation</span>
            <span className="tabular-nums">{formatEuros(part.coutPropre)}</span>
          </li>
        </ul>
      )}
    </li>
  )
}

/** Mode Avancé : qui participe à chaque activité, et qui la paie. */
function TableauActivites({ activites, voyageurs, regles, onChange }: { activites: ActiviteRepartie[]; voyageurs: Voyageur[]; regles: ReglagesRepartition; onChange: (r: ReglagesRepartition) => void }) {
  if (activites.length === 0) return <p className="text-sm text-slate-500 dark:text-slate-400">Aucune activité payante dans l’itinéraire.</p>
  const basculer = (id: string, cle: keyof RegleActivite, vid: string, defaut: string[]) => {
    const r = regles.activites?.[id] ?? {}
    const liste = r[cle] ?? defaut
    const nouvelle = liste.includes(vid) ? liste.filter((x) => x !== vid) : [...liste, vid]
    onChange({ ...regles, activites: { ...regles.activites, [id]: { ...r, [cle]: nouvelle } } })
  }
  const payeursParDefaut = voyageurs.filter((v) => v.paiement === 'part' || (v.paiement === 'postes' && v.postes?.includes('activites'))).map((v) => v.id)
  return (
    <div className="space-y-3">
      {activites.map((a) => {
        const r = regles.activites?.[a.id] ?? {}
        const participants = r.participants ?? voyageurs.map((v) => v.id)
        const payeurs = r.payeurs ?? payeursParDefaut
        return (
          <fieldset key={a.id} className="rounded-2xl bg-slate-900/4 p-3 dark:bg-white/6">
            <legend className="sr-only">{a.nom}</legend>
            <p className="mb-2 flex justify-between gap-2 text-sm font-semibold">
              <span className="min-w-0 truncate">{a.nom}</span>
              <span className="shrink-0 tabular-nums">{formatEuros(a.prix)}</span>
            </p>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Participe</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Paie</span>
              {voyageurs.map((v, i) => (
                <div key={v.id} className="contents">
                  <span className="flex min-w-0 items-center gap-2">
                    <AvatarVoyageur nom={nomVoyageur(v, voyageurs)} index={i} taille={22} className="ring-1!" />
                    <span className="truncate">{nomVoyageur(v, voyageurs)}</span>
                  </span>
                  <input type="checkbox" className="mx-auto size-5 accent-ocean-600" checked={participants.includes(v.id)} onChange={() => basculer(a.id, 'participants', v.id, voyageurs.map((x) => x.id))} aria-label={`${nomVoyageur(v, voyageurs)} participe à ${a.nom}`} />
                  <input type="checkbox" className="mx-auto size-5 accent-ocean-600" checked={payeurs.includes(v.id)} onChange={() => basculer(a.id, 'payeurs', v.id, payeursParDefaut)} aria-label={`${nomVoyageur(v, voyageurs)} paie sa place à ${a.nom}`} />
                </div>
              ))}
            </div>
          </fieldset>
        )
      })}
      <p className="text-xs text-slate-500 dark:text-slate-400">« Paie » : il règle sa propre place. La place de ceux qui ne paient pas est reprise par ceux qui paient leur part.</p>
    </div>
  )
}

/**
 * Onglet « Qui paie quoi » : une carte par voyageur, le donut, et la feuille « Modifier la répartition »
 * où chaque changement met à jour les montants en direct.
 */
export function OngletQuiPaie({ resultat, simple, activites, avance, onModifier, actions }: { resultat: ResultatRepartition; simple: ReglagesSimples; activites: ActiviteRepartie[]; avance: boolean; onModifier: (p: Partial<ReglagesSimples>) => void; actions?: React.ReactNode }) {
  const feuille = useRef<HTMLDialogElement>(null)
  const voyageurs = voyageursDe(simple)
  const regles = simple.repartition ?? {}
  return (
    <section aria-label="Qui paie quoi" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => feuille.current?.showModal()} className="bouton-accent inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold">
          <SlidersHorizontal className="size-4" aria-hidden /> Modifier la répartition
        </button>
        {actions}
      </div>

      {!resultat.ok ? (
        <p role="alert" className="rounded-2xl bg-(--statut-depasse)/10 px-3 py-2 text-sm text-(--statut-depasse-texte)">
          {resultat.erreur}
        </p>
      ) : (
        <>
          <div className="verre reflet flex flex-col items-center gap-4 rounded-[1.75rem] p-4 [--verre-fond:0.7] sm:flex-row dark:[--verre-fond:0.5]">
            <DonutRepartition parts={resultat.parts} total={resultat.total} />
            <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
              {resultat.parts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: couleurVoyageur(i) }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{p.nom}</span>
                  <span className="font-semibold tabular-nums">{formatEuros(p.montant)}</span>
                  <span className="w-10 text-right text-xs text-slate-500 tabular-nums dark:text-slate-400">{resultat.total > 0 ? Math.round((p.montant / resultat.total) * 100) : 0} %</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {resultat.parts.map((p, i) => (
              <CartePart key={p.id} part={p} voyageur={voyageurs[i]} index={i} />
            ))}
          </ul>
        </>
      )}

      <dialog ref={feuille} aria-labelledby="titre-repartition" className="feuille-verre verre m-auto max-h-[88dvh] w-[min(34rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[1.75rem] p-4 text-slate-900 [--verre-fond:0.94] dark:text-slate-100 dark:[--verre-fond:0.9]" onClick={(e) => e.target === feuille.current && feuille.current.close()}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="titre-repartition" className="text-lg font-semibold">
            Modifier la répartition
          </h2>
          <button type="button" onClick={() => feuille.current?.close()} className="grid size-10 place-items-center rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>
        {resultat.ok ? (
          <p className="mb-3 flex flex-wrap gap-1.5" aria-live="polite">
            {resultat.parts.map((p, i) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 py-0.5 pr-2 pl-0.5 text-xs dark:bg-white/10">
                <AvatarVoyageur nom={p.nom} index={i} taille={18} className="ring-1!" /> {p.nom} <b className="tabular-nums">{formatEuros(p.montant)}</b>
              </span>
            ))}
          </p>
        ) : (
          <p role="alert" className="mb-3 rounded-2xl bg-(--statut-depasse)/10 px-3 py-2 text-sm text-(--statut-depasse-texte)">
            {resultat.erreur}
          </p>
        )}
        <EditeurVoyageurs voyageurs={voyageurs} onChange={(l) => onModifier({ voyageurs: l })} avance={avance} montants={resultat.ok ? new Map(resultat.parts.map((p) => [p.id, p.montant])) : undefined} />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Changer le nombre d’adultes, d’enfants ou de bébés recalcule le voyage.</p>
        {avance && (
          <div className="mt-5 space-y-3">
            <h3 className="font-semibold">Activités : qui participe, qui paie</h3>
            <TableauActivites activites={activites} voyageurs={voyageurs} regles={regles} onChange={(repartition) => onModifier({ repartition })} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 accent-ocean-600" checked={!!regles.logementParChambre} onChange={(e) => onModifier({ repartition: { ...regles, logementParChambre: e.target.checked, chambres: regles.chambres ?? chambresParDefaut(voyageurs) } })} />
              <span>
                Logement réparti par chambre
                <span className="block text-xs text-slate-500 dark:text-slate-400">Chaque chambre coûte autant ; on partage ensuite à l’intérieur. Chambres : {(regles.chambres ?? chambresParDefaut(voyageurs)).map((c) => c.map((id) => nomVoyageur(voyageurs.find((v) => v.id === id) ?? voyageurs[0], voyageurs)).join(' et ')).join(' · ')}</span>
              </span>
            </label>
          </div>
        )}
        <button type="button" onClick={() => feuille.current?.close()} className="bouton-accent mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold">
          Terminé
        </button>
      </dialog>
    </section>
  )
}

/** Chambres par défaut : les adultes deux par deux, les enfants et bébés avec le premier adulte de leur famille. */
export function chambresParDefaut(voyageurs: Voyageur[]): string[][] {
  const adultes = voyageurs.filter((v) => v.type === 'adulte')
  const chambres: string[][] = []
  for (let i = 0; i < adultes.length; i += 2) chambres.push(adultes.slice(i, i + 2).map((v) => v.id))
  const autres = voyageurs.filter((v) => v.type !== 'adulte').map((v) => v.id)
  if (autres.length) (chambres[0] ??= []).push(...autres)
  return chambres
}
