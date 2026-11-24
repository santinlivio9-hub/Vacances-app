import { AlertTriangle, ArrowLeft, Bookmark, CalendarDays, CheckCircle2, CircleAlert, Pencil, Printer, Share2, Shuffle, Users } from 'lucide-react'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { versDonneesTrajet } from '../carte/itineraire'
import { etatBudget, type EntreeCouts } from '../engine/couts'
import { ajouterJours } from '../engine/dates'
import { remplacerActivite } from '../engine/itineraire'
import { checklistVoyage, genererLiensReservation } from '../engine/liens'
import { encoderVoyage } from '../engine/partage'
import { cleVoyage, useResultat } from '../store/resultat'
import { cleTrajet, useVoyage } from '../store/voyage'
import { formatEuros } from '../ui/format'
import { MentionDonnees } from '../ui/MentionDonnees'
import { imageLargeur } from '../services/wikipedia'
import { coutsDuResultat } from '../voyage/calcul'
import { Economies } from '../voyage/Economies'
import { OngletItineraire } from '../voyage/OngletItineraire'
import { OngletReservations } from '../voyage/OngletReservations'
import { TableauBudget } from '../voyage/TableauBudget'
import { MODES_UI } from '../config/libelles'

const OngletCarte = lazy(() => import('../voyage/OngletCarte'))
const OngletBudget = lazy(() => import('../voyage/OngletBudget'))

const ONGLETS = [
  { id: 'itineraire', libelle: 'Itinéraire' },
  { id: 'carte', libelle: 'Carte' },
  { id: 'budget', libelle: 'Budget' },
  { id: 'reservations', libelle: 'Réservations' },
] as const
type Onglet = (typeof ONGLETS)[number]['id']

const STATUTS = {
  ok: { libelle: 'Dans votre budget', icone: CheckCircle2, couleur: 'var(--statut-ok)' },
  juste: { libelle: 'Budget juste', icone: CircleAlert, couleur: 'var(--statut-juste)' },
  depasse: { libelle: 'Budget dépassé', icone: AlertTriangle, couleur: 'var(--statut-depasse)' },
}

const dateMoyenne = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const chargement = <div className="grid h-64 place-items-center text-slate-500">Chargement…</div>

export default function Voyage() {
  const navigate = useNavigate()
  const { depart, arrivee, reglages, graine, regenerer, sauvegarder, appliquerChangements, coches, basculerCoche } = useVoyage()
  const { resultat, remplacerItineraire } = useResultat()
  const [onglet, setOnglet] = useState<Onglet>('itineraire')
  const [message, setMessage] = useState<string | null>(null)
  const dialogue = useRef<HTMLDialogElement>(null)
  const [nomSauvegarde, setNomSauvegarde] = useState('')
  const refsOnglets = useRef<(HTMLButtonElement | null)[]>([])

  const cle = depart && arrivee ? cleVoyage(depart, arrivee, reglages, graine) : null
  const pret = !!resultat && resultat.cle === cle

  const donnees = useMemo(() => {
    if (!pret || !depart || !arrivee || !resultat) return null
    const entree: EntreeCouts = { trajet: versDonneesTrajet(depart, arrivee, resultat.itineraireCarte), arrivee, reglages }
    return {
      entree,
      couts: coutsDuResultat(resultat, depart, arrivee, reglages),
      liens: genererLiensReservation({ depart, arrivee, reglages }),
      checklist: checklistVoyage({ arrivee, reglages }),
    }
  }, [pret, resultat, depart, arrivee, reglages])

  if (!depart || !arrivee) return <Navigate to="/" replace />
  if (!pret || !resultat || !donnees) return <Navigate to="/calcul" replace />

  const { couts, entree } = donnees
  const s = reglages.simple
  const voyageurs = s.adultes + s.enfants
  const { statut, ratio } = etatBudget(couts.total, s.budget)
  const st = statut === 'libre' ? null : STATUTS[statut]
  const ville = arrivee.nom
  const prefixeCoche = cleTrajet(depart, arrivee)

  function afficher(texte: string) {
    setMessage(texte)
    setTimeout(() => setMessage(null), 3500)
  }

  async function partager() {
    const url = `${location.origin}${location.pathname}#/partage?v=${encoderVoyage({ depart: depart!, arrivee: arrivee!, reglages, graine })}`
    const titre = `Voyage ${depart!.nom} → ${arrivee!.nom}`
    try {
      if (navigator.share) {
        await navigator.share({ title: titre, text: `${titre} : environ ${formatEuros(couts.total)}`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      afficher('Lien copié : collez-le pour partager ce voyage.')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') window.prompt('Copiez ce lien pour partager le voyage :', url)
    }
  }

  function remplacer(jour: number, position: number) {
    const nouveau = remplacerActivite(resultat!.itineraire, jour, position, {
      lieux: resultat!.lieux,
      source: resultat!.sourceLieux,
      centre: arrivee!,
      ville,
      reglages,
      indice: couts.pays.indice,
      mode: s.transport,
      dureeAllerMin: couts.transport.dureeAllerMin,
      graine,
    })
    if (nouveau === resultat!.itineraire) afficher('Aucun autre lieu disponible pour cette activité.')
    else remplacerItineraire(nouveau)
  }

  return (
    <div className="min-h-dvh pb-12">
      {/* En-tête : photo, total, jauge */}
      <header className="relative isolate overflow-hidden bg-gradient-to-br from-ocean-600 to-ocean-900 text-white print:bg-none print:text-black">
        {resultat.resume?.image && <img src={imageLargeur(resultat.resume.image, 1280)} alt="" className="absolute inset-0 -z-10 size-full object-cover print:hidden" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/45 to-black/35 print:hidden" />
        <div className="mx-auto max-w-3xl px-4 pt-3 pb-5">
          <div className="flex items-center justify-between print:hidden">
            <Link to="/" className="grid size-11 place-items-center rounded-full bg-black/25 backdrop-blur hover:bg-black/40" aria-label="Retour à la carte">
              <ArrowLeft className="size-5" />
            </Link>
            <Link to="/mes-voyages" className="flex h-10 items-center gap-1.5 rounded-full bg-black/25 px-3 text-sm font-medium backdrop-blur hover:bg-black/40">
              <Bookmark className="size-4" aria-hidden /> Mes voyages
            </Link>
          </div>
          <p className="mt-10 text-sm text-white/85 print:mt-0 print:text-slate-600">
            Depuis {depart.nom} · {MODES_UI[s.transport].libelle.toLowerCase()}
          </p>
          <h1 className="text-3xl font-bold [text-wrap:balance] sm:text-4xl">{arrivee.nom}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90 print:text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden /> {dateMoyenne(s.dateDepart)} → {dateMoyenne(ajouterJours(s.dateDepart, s.nuits))}, {s.nuits} nuit{s.nuits > 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden /> {voyageurs} voyageur{voyageurs > 1 ? 's' : ''}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p>
              <span className="block text-xs text-white/80 print:text-slate-600">Estimation totale</span>
              <span className="text-4xl font-bold tabular-nums">{formatEuros(couts.total)}</span>
            </p>
            <p className="pb-1 text-lg font-semibold tabular-nums">
              {formatEuros(couts.parPersonne)} <span className="text-sm font-normal text-white/80 print:text-slate-600">/ personne</span>
            </p>
          </div>
          {st && s.budget != null && (
            <div className="mt-3 max-w-md">
              <div className="h-2 overflow-hidden rounded-full bg-white/25" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label="Part du budget utilisée">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, ratio * 100)}%`, background: st.couleur }} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                <st.icone className="size-4" style={{ color: st.couleur }} aria-hidden />
                {st.libelle} : {Math.round(ratio * 100)} % de {formatEuros(s.budget)}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Actions */}
      <nav aria-label="Actions sur le voyage" className="sticky top-0 z-10 border-b border-slate-900/5 bg-ocean-50/90 backdrop-blur print:hidden dark:border-white/10 dark:bg-ocean-950/90">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 py-1.5 sm:flex sm:py-2">
          {[
            { icone: Pencil, libelle: 'Modifier', action: () => navigate('/configurer') },
            { icone: Shuffle, libelle: 'Régénérer', action: () => { regenerer(); navigate('/calcul') } },
            { icone: Bookmark, libelle: 'Sauvegarder', action: () => { setNomSauvegarde(`${arrivee.nom}, ${dateMoyenne(s.dateDepart)}`); dialogue.current?.showModal() } },
            { icone: Share2, libelle: 'Partager', action: partager },
            { icone: Printer, libelle: 'PDF', action: () => window.print() },
          ].map(({ icone: Icone, libelle, action }) => (
            <button key={libelle} type="button" onClick={action} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-semibold text-ocean-800 hover:bg-ocean-100 sm:h-11 sm:min-h-0 sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3.5 sm:text-sm dark:text-ocean-100 dark:hover:bg-white/10">
              <Icone className="size-5 sm:size-4" aria-hidden />
              {libelle}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-5">
        {couts.avertissements.map((a) => (
          <p key={a} className="flex items-start gap-2 rounded-2xl bg-(--statut-juste)/15 px-3 py-2 text-sm text-(--statut-juste-texte)">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {a}
          </p>
        ))}
        {s.budget != null && couts.total > s.budget && (
          <div className="print:hidden">
            <Economies
              entree={entree}
              budget={s.budget}
              total={couts.total}
              onAppliquer={(c) => {
                appliquerChangements(c)
                navigate('/calcul')
              }}
            />
          </div>
        )}

        {/* Onglets */}
        <div role="tablist" aria-label="Sections du voyage" className="grid grid-cols-4 rounded-2xl bg-slate-900/5 p-1 print:hidden dark:bg-white/10">
          {ONGLETS.map((o, i) => (
            <button
              key={o.id}
              ref={(el) => {
                refsOnglets.current[i] = el
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
                refsOnglets.current[j]?.focus()
              }}
              className={`h-10 rounded-xl text-xs font-semibold transition sm:text-sm ${onglet === o.id ? 'bg-white text-ocean-800 shadow-sm dark:bg-ocean-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {o.libelle}
            </button>
          ))}
        </div>

        <div id={`panneau-${onglet}`} role="tabpanel" aria-labelledby={`onglet-${onglet}`} className="print:hidden">
          {onglet === 'itineraire' && <OngletItineraire itineraire={resultat.itineraire} ville={ville} onRemplacer={remplacer} />}
          {onglet === 'carte' && (
            <Suspense fallback={chargement}>
              <OngletCarte itineraire={resultat.itineraire} arrivee={arrivee} />
            </Suspense>
          )}
          {onglet === 'budget' && (
            <Suspense fallback={chargement}>
              <OngletBudget couts={couts} />
            </Suspense>
          )}
          {onglet === 'reservations' && (
            <OngletReservations liens={donnees.liens} checklist={donnees.checklist} coche={(id) => !!coches[`${prefixeCoche}:${id}`]} onCocher={(id) => basculerCoche(`${prefixeCoche}:${id}`)} />
          )}
        </div>

        {/* Version imprimable : itinéraire et budget l'un après l'autre */}
        <div className="hidden space-y-8 print:block">
          <OngletItineraire itineraire={resultat.itineraire} ville={ville} onRemplacer={() => {}} />
          <TableauBudget couts={couts} />
        </div>

        <MentionDonnees className="pt-4" />
      </main>

      {message && (
        <p role="status" className="fixed inset-x-4 bottom-4 z-30 mx-auto max-w-sm rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm text-white shadow-lg print:hidden">
          {message}
        </p>
      )}

      <dialog ref={dialogue} aria-labelledby="titre-sauvegarde" className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-black/40 dark:bg-slate-900 dark:text-slate-100">
        <form
          method="dialog"
          onSubmit={() => {
            const v = sauvegarder(nomSauvegarde.trim() || `${arrivee.nom}`)
            if (v) afficher('Voyage sauvegardé dans « Mes voyages ».')
          }}
        >
          <h2 id="titre-sauvegarde" className="text-lg font-semibold">
            Sauvegarder ce voyage
          </h2>
          <label htmlFor="nom-voyage" className="mt-3 block text-sm font-medium">
            Nom du voyage
          </label>
          <input id="nom-voyage" value={nomSauvegarde} onChange={(e) => setNomSauvegarde(e.target.value)} maxLength={60} className="mt-1 h-12 w-full rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-900/10 dark:bg-white/5 dark:ring-white/10" />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => dialogue.current?.close()} className="h-11 rounded-full px-4 font-semibold text-slate-600 dark:text-slate-300">
              Annuler
            </button>
            <button type="submit" className="h-11 rounded-full bg-ocean-700 px-5 font-semibold text-white">
              Sauvegarder
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
