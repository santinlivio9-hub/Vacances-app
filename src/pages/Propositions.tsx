import { AlertTriangle, ArrowLeft, CalendarRange, GitCompareArrows, SlidersHorizontal, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { LOGEMENTS_UI } from '../config/libelles'
import type { TypeLogement } from '../domain/types'
import { nomPeriode } from '../engine/periodes'
import type { Proposition } from '../engine/propositions'
import { useResultat } from '../store/resultat'
import { useVoyage } from '../store/voyage'
import { formatEuros } from '../ui/format'
import { MentionDonnees } from '../ui/MentionDonnees'
import { CarteProposition } from '../voyage/CarteProposition'
import { resultatPour } from '../voyage/calcul'
import { TableauComparaison } from '../voyage/TableauComparaison'

type Tri = 'pertinence' | 'prix' | 'confort' | 'duree'
const TRIS: { id: Tri; libelle: string }[] = [
  { id: 'pertinence', libelle: 'Recommandé' },
  { id: 'prix', libelle: 'Prix' },
  { id: 'confort', libelle: 'Confort' },
  { id: 'duree', libelle: 'Trajet' },
]

const puce = (actif: boolean) =>
  `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm ring-1 transition ${actif ? 'bg-ocean-700 font-semibold text-white ring-ocean-700' : 'bg-white text-slate-700 ring-slate-900/10 hover:ring-ocean-400 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10'}`

export default function Propositions() {
  const navigate = useNavigate()
  const { depart, arrivee, definirReglages, sauvegarder } = useVoyage()
  const { propositions: calcul, definir, marquerChoisie } = useResultat()
  const [tri, setTri] = useState<Tri>('pertinence')
  const [logements, setLogements] = useState<TypeLogement[]>([])
  const [comparer, setComparer] = useState(false)
  const [selection, setSelection] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const dialogue = useRef<HTMLDialogElement>(null)

  const visibles = useMemo(() => {
    if (!calcul) return []
    const liste = calcul.propositions.filter((p) => logements.length === 0 || logements.includes(p.logement))
    const ordre: Record<Tri, (a: Proposition, b: Proposition) => number> = {
      pertinence: () => 0,
      prix: (a, b) => a.total - b.total,
      confort: (a, b) => b.confort - a.confort || a.total - b.total,
      duree: (a, b) => a.dureeTrajetMin - b.dureeTrajetMin || a.total - b.total,
    }
    return [...liste].sort(ordre[tri])
  }, [calcul, logements, tri])

  if (!depart || !arrivee) return <Navigate to="/" replace />
  if (!calcul) return <Navigate to="/calcul" replace />

  const s = calcul.reglages.simple
  const voyageurs = s.adultes + s.enfants
  const stage = s.typeVoyage === 'stage'
  const typesPresents = [...new Set(calcul.propositions.map((p) => p.logement))]
  const choisies = calcul.propositions.filter((p) => selection.includes(p.id))

  function afficher(texte: string) {
    setMessage(texte)
    setTimeout(() => setMessage(null), 3500)
  }

  function choisir(p: Proposition) {
    definirReglages(p.reglages)
    definir(resultatPour(calcul!.base, depart!, arrivee!, p.reglages, calcul!.graine))
    marquerChoisie(p.id)
    navigate('/voyage')
  }

  function cocher(id: string) {
    setSelection((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : sel.length >= 3 ? [...sel.slice(1), id] : [...sel, id]))
  }

  return (
    <div className="min-h-dvh pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-slate-900/5 bg-ocean-50 dark:border-white/10 dark:bg-[#071433]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              definirReglages(calcul.reglages)
              navigate('/configurer')
            }}
            className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10"
            aria-label="Modifier les réglages"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">Vos propositions</h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {depart.nom} → {arrivee.nom} · {calcul.propositions.length} propositions
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setComparer((c) => !c)
              setSelection([])
            }}
            aria-pressed={comparer}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${comparer ? 'bg-ocean-700 text-white' : 'text-ocean-800 ring-1 ring-ocean-600/40 hover:bg-ocean-100 dark:text-ocean-100'}`}
          >
            {comparer ? <X className="size-4" aria-hidden /> : <GitCompareArrows className="size-4" aria-hidden />}
            {comparer ? 'Terminer' : 'Comparer'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-3 pt-4">
        {calcul.alerte && (
          <p role="alert" className="flex items-start gap-2 rounded-2xl bg-(--statut-depasse)/10 px-3 py-2.5 text-sm text-(--statut-depasse-texte)">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {calcul.alerte}
          </p>
        )}

        {calcul.periodes && calcul.periodes.meilleures.length > 0 && (
          <section aria-labelledby="titre-periodes" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-[#0e1f45] dark:ring-white/10">
            <h2 id="titre-periodes" className="flex items-center gap-2 font-semibold">
              <CalendarRange className="size-5 text-teal-700 dark:text-teal-300" aria-hidden /> Les périodes les moins chères
            </h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              {calcul.periodes.periodes.length} mois testés, pour {s.flexible.dureeMin === s.flexible.dureeMax ? `${s.flexible.dureeMin} nuits` : `${s.flexible.dureeMin} à ${s.flexible.dureeMax} nuits`}. Prix avec vos réglages ; les propositions ci-dessous cherchent encore moins cher. Écart entre le mois le moins cher et le plus cher : {formatEuros(calcul.periodes.ecartMax)}.
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {calcul.periodes.meilleures.map((p, i) => {
                const plusChere = Math.max(...calcul.periodes!.periodes.map((x) => x.total))
                return (
                  <li key={p.dateDepart} className={`rounded-2xl p-3 ring-1 ${i === 0 ? 'bg-teal-50 ring-teal-600/30 dark:bg-teal-950/40' : 'ring-slate-900/10 dark:ring-white/10'}`}>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {i + 1}. Saison {p.saison}
                    </p>
                    <p className="font-semibold first-letter:uppercase">{nomPeriode(p)}</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatEuros(p.total)}
                      {p.totalMax !== p.total && <span className="text-sm font-normal text-slate-500 dark:text-slate-400"> à {formatEuros(p.totalMax)}</span>}
                    </p>
                    {plusChere - p.total > 1 && <p className="text-xs font-medium text-(--statut-ok-texte)">{formatEuros(plusChere - p.total)} de moins que le mois le plus cher</p>}
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {/* Tris et filtres */}
        <div className="space-y-2">
          <div role="radiogroup" aria-label="Trier les propositions" className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 [scrollbar-width:none]">
            <SlidersHorizontal className="size-4 shrink-0 text-slate-500" aria-hidden />
            {TRIS.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={tri === t.id} onClick={() => setTri(t.id)} className={puce(tri === t.id)}>
                {t.id === 'duree' && stage ? 'Distance' : t.libelle}
              </button>
            ))}
          </div>
          {typesPresents.length > 1 && (
            <div role="group" aria-label="Filtrer par type de logement" className="-mx-3 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none]">
              {typesPresents.map((l) => {
                const Icone = LOGEMENTS_UI[l].icone
                const actif = logements.includes(l)
                return (
                  <button key={l} type="button" aria-pressed={actif} onClick={() => setLogements((x) => (actif ? x.filter((y) => y !== l) : [...x, l]))} className={puce(actif)}>
                    <Icone className="size-4" aria-hidden /> {LOGEMENTS_UI[l].libelle}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {comparer && <p className="text-sm text-slate-600 dark:text-slate-300">Sélectionnez 2 ou 3 propositions à comparer côte à côte.</p>}

        <motion.ul layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {visibles.map((p) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex">
                <div className="flex w-full flex-col [&>article]:flex-1">
                  <CarteProposition
                    p={p}
                    depart={depart}
                    arrivee={arrivee}
                    graine={calcul.graine}
                    image={calcul.base.resume?.image}
                    budget={s.budget}
                    voyageurs={voyageurs}
                    comparer={comparer}
                    coche={selection.includes(p.id)}
                    onCocher={() => cocher(p.id)}
                    onChoisir={() => choisir(p)}
                    onSauvegarder={() => {
                      sauvegarder(`${arrivee.nom} : ${p.titre.toLowerCase()}`, { total: p.total, proposition: `${p.titre} · ${p.sousTitre}`, reglages: p.reglages })
                      afficher('Proposition sauvegardée dans « Mes voyages ».')
                    }}
                  />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
        {visibles.length === 0 && <p className="py-10 text-center text-slate-500">Aucune proposition avec ces filtres.</p>}

        <MentionDonnees className="pt-2" />
      </main>

      {/* Barre de comparaison */}
      <AnimatePresence>
        {comparer && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="verre fixed inset-x-3 bottom-[calc(var(--nav-bas)+0.75rem)] z-30 mx-auto flex max-w-md items-center gap-3 rounded-3xl p-2 pl-4 [--verre-fond:0.95] lg:left-[calc(var(--nav-gauche)+0.75rem)]"
          >
            <p className="min-w-0 flex-1 text-sm font-medium">{selection.length === 0 ? 'Aucune sélection' : `${selection.length} sélectionnée${selection.length > 1 ? 's' : ''}`}</p>
            <button
              type="button"
              disabled={selection.length < 2}
              onClick={() => dialogue.current?.showModal()}
              className="bouton-accent h-11 rounded-2xl px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              Comparer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <dialog
        ref={dialogue}
        aria-labelledby="titre-comparaison"
        className="feuille-verre verre m-auto max-h-[90dvh] w-[min(48rem,calc(100vw-1.5rem))] rounded-[1.75rem] p-4 text-slate-900 [--verre-fond:0.92] dark:text-slate-100 dark:[--verre-fond:0.86]"
        onClick={(e) => e.target === dialogue.current && dialogue.current.close()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="titre-comparaison" className="text-lg font-semibold">
            Comparaison
          </h2>
          <button type="button" onClick={() => dialogue.current?.close()} className="grid size-10 place-items-center rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10" aria-label="Fermer la comparaison">
            <X className="size-5" />
          </button>
        </div>
        {choisies.length >= 2 && <TableauComparaison propositions={choisies} />}
        <div className="mt-4 grid grid-cols-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, choisies.length)}, minmax(0, 1fr))` }}>
          {choisies.map((p) => (
            <button key={p.id} type="button" onClick={() => choisir(p)} className="min-h-11 rounded-2xl bouton-accent px-2 py-2 text-sm leading-tight font-semibold text-white">
              Choisir « {p.titre} »
            </button>
          ))}
        </div>
      </dialog>

      {message && (
        <p role="status" className="verre-sombre fixed inset-x-4 bottom-[calc(var(--nav-bas)+1rem)] z-40 mx-auto max-w-sm rounded-full px-4 py-3 text-center text-sm text-white">
          {message}
        </p>
      )}
    </div>
  )
}
