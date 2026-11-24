import { AlertTriangle, ArrowLeft, Bookmark, LayoutGrid, CalendarDays, CheckCircle2, CircleAlert, Pencil, Printer, Share2, Shuffle, Users } from 'lucide-react'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { versDonneesTrajet } from '../carte/itineraire'
import { etatBudget, type EntreeCouts } from '../engine/couts'
import { ajouterJours } from '../engine/dates'
import { remplacerActivite } from '../engine/itineraire'
import { checklistVoyage, genererLiensReservation } from '../engine/liens'
import { encoderVoyage } from '../engine/partage'
import { cleVoyage, useResultat } from '../store/resultat'
import { cleTrajet, dateDuJour, useVoyage } from '../store/voyage'
import { formatEntre, formatEuros } from '../ui/format'
import { comparatifTrajets } from '../engine/transport'
import { CartesTrajets } from '../voyage/CartesTrajets'
import { AnneauBudget, BadgeEcart, Glass, Montant, PisteLiquide, classeOnglet, FOND_PISTE } from '../ui/glass'
import { MentionDonnees } from '../ui/MentionDonnees'
import { classeEnTeteVerre, useDefile } from '../ui/useDefile'
import { imageLargeur } from '../services/wikipedia'
import { coutsDuResultat } from '../voyage/calcul'
import { Economies } from '../voyage/Economies'
import { OngletItineraire } from '../voyage/OngletItineraire'
import { OngletReservations } from '../voyage/OngletReservations'
import { TableauBudget } from '../voyage/TableauBudget'
import { LOGEMENTS_UI, MODES_UI } from '../config/libelles'
import { reglagesEffectifs } from '../engine/reglages'
import { estimationEnDirect } from '../engine/estimation'
import { typeVoyage } from '../tripTypes'
import { VueSejourLong } from '../voyage/VueSejourLong'

const OngletCarte = lazy(() => import('../voyage/OngletCarte'))
const OngletBudget = lazy(() => import('../voyage/OngletBudget'))

const ONGLETS = [
  { id: 'itineraire', libelle: 'Itinéraire' },
  { id: 'trajet', libelle: 'Trajet' },
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
  // La barre d'actions colle en haut une fois l'en-tête photo passé : elle devient alors du verre
  const defile = useDefile(220)
  const { depart, arrivee, reglages, graine, regenerer, sauvegarder, appliquerChangements, coches, basculerCoche } = useVoyage()
  const { resultat, remplacerItineraire, propositions } = useResultat()
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
    const stage = typeVoyage(reglages.simple).calcul === 'sejourLong'
    const couts = coutsDuResultat(resultat, depart, arrivee, reglages)
    return {
      entree,
      // Même calcul que la barre du bas de la configuration
      sejour: stage ? (estimationEnDirect(entree, dateDuJour()).sejourLong ?? null) : null,
      couts,
      trajets: comparatifTrajets(entree.trajet, reglages.simple, reglagesEffectifs(reglages), couts.saison),
      liens: genererLiensReservation({ depart, arrivee, reglages }),
      checklist: checklistVoyage({ arrivee, reglages }),
    }
  }, [pret, resultat, depart, arrivee, reglages])

  if (!depart || !arrivee) return <Navigate to="/" replace />
  if (!pret || !resultat || !donnees) return <Navigate to="/calcul?vers=voyage" replace />

  const { couts, entree, sejour } = donnees
  const s = reglages.simple
  const voyageurs = s.adultes + s.enfants
  const total = sejour ? sejour.total : couts.total
  const parPersonne = sejour ? sejour.parPersonne : couts.parPersonne
  const avertissements = sejour ? sejour.avertissements : couts.avertissements
  const choisie = propositions?.propositions.find((p) => p.id === propositions.choisie)
  // Les propositions concernent bien ce trajet
  const avecPropositions = !!choisie && propositions!.cle.startsWith(JSON.stringify([depart.lat, depart.lon, arrivee.lat, arrivee.lon]).slice(0, -1))
  const { statut, ratio } = etatBudget(total, s.budget)
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
        await navigator.share({ title: titre, text: `${titre} : environ ${formatEuros(total)}`, url })
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
    <div className="min-h-dvh pb-[calc(3rem+env(safe-area-inset-bottom))]">
      {/* En-tête : photo, total, jauge */}
      <header className="relative isolate overflow-hidden bg-gradient-to-br from-ocean-600 to-ocean-900 text-white print:bg-none print:text-black">
        {resultat.resume?.image && <img onError={(e) => (e.currentTarget.style.display = 'none')} src={imageLargeur(resultat.resume.image, 1280)} alt="" className="absolute inset-0 -z-10 size-full object-cover print:hidden" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/45 to-black/35 print:hidden" />
        {/* Haut assombri : l'heure et la batterie de l'iPhone restent lisibles sur la photo */}
        <div className="absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-black/60 to-transparent print:hidden" />
        <div className="mx-auto max-w-3xl px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-5">
          <div className="flex items-center justify-between print:hidden">
            <Link
              to={avecPropositions ? '/propositions' : '/'}
              className="grid size-11 place-items-center rounded-full bg-black/25 backdrop-blur hover:bg-black/40"
              aria-label={avecPropositions ? 'Retour aux propositions' : 'Retour à la carte'}
            >
              <ArrowLeft className="size-5" />
            </Link>
            {avecPropositions && (
              <Link to="/propositions" className="flex h-10 items-center gap-1.5 rounded-full bg-black/25 px-3 text-sm font-medium backdrop-blur hover:bg-black/40">
                <LayoutGrid className="size-4" aria-hidden /> Propositions
              </Link>
            )}
          </div>
          <p className="mt-10 text-sm break-words text-white/85 print:mt-0 print:text-slate-600">
            {choisie ? `${choisie.titre} · ` : ''}
            {sejour ? `Stage · ${LOGEMENTS_UI[sejour.logement].libelle.toLowerCase()}` : `Depuis ${depart.nom} · ${LOGEMENTS_UI[reglagesEffectifs(reglages).typeLogement].libelle.toLowerCase()}`}
          </p>
          <p className="text-sm text-white/85 print:text-slate-600">
            Proposition en {MODES_UI[s.transport].libelle.toLowerCase()}
            {resultat.itineraireCarte.mode !== s.transport && ` · ${{ voiture: 'la voiture', train: 'le train', avion: 'l’avion', car: 'l’autocar', covoiturage: 'le covoiturage' }[resultat.itineraireCarte.mode]} est conseillé`}
          </p>
          <h1 className="text-3xl font-bold [text-wrap:balance] sm:text-4xl">{arrivee.nom}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90 print:text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden /> {dateMoyenne(s.dateDepart)} → {dateMoyenne(ajouterJours(s.dateDepart, s.nuits))},{' '}
              {sejour ? `${Math.round(s.nuits / 7)} semaines` : `${s.nuits} nuit${s.nuits > 1 ? 's' : ''}`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden /> {voyageurs} voyageur{voyageurs > 1 ? 's' : ''}
            </span>
          </p>
          <Glass variante="clear" refraction className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2 border-white/25! bg-black/30! p-4 text-white shadow-2xl print:border-0! print:bg-transparent! print:p-0">
            <p>
              <span className="block text-xs text-white/80 print:text-slate-600">{sejour ? 'Tout le séjour' : 'Estimation totale'}</span>
              <Montant valeur={total} className="block text-4xl" />
              {!sejour && <span className="block text-sm text-white/85 print:text-slate-600">{formatEntre(couts.fourchette)}</span>}
            </p>
            <p className="pb-1 text-lg font-semibold tabular-nums">
              {sejour ? (
                <>
                  {formatEuros(sejour.totalMensuel)} <span className="text-sm font-normal text-white/80 print:text-slate-600">/ mois + {formatEuros(sejour.fraisPonctuels)} de frais ponctuels</span>
                </>
              ) : (
                <>
                  {formatEuros(parPersonne)} <span className="text-sm font-normal text-white/80 print:text-slate-600">/ personne</span>
                </>
              )}
            </p>
          </Glass>
          {sejour && sejour.gratification.total > 0 && (
            <p className="mt-1 text-sm text-white/90 print:text-slate-700">
              {sejour.resteAChargeTotal >= 0
                ? `Reste à charge, gratification déduite : ${formatEuros(sejour.resteAChargeMois)} par mois · ${formatEuros(sejour.resteAChargeTotal)} pour le séjour`
                : `Gratification déduite : excédent de ${formatEuros(-sejour.resteAChargeTotal)} sur le séjour`}
            </p>
          )}
          {st && s.budget != null && (
            <div className="mt-3 flex max-w-md items-center gap-3">
              <AnneauBudget ratio={ratio} taille={52} className="text-white print:text-slate-700" />
              <p className="min-w-0 text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <st.icone className="size-4 shrink-0" style={{ color: st.couleur }} aria-hidden />
                  {st.libelle} · {formatEuros(s.budget)}
                </span>
                <BadgeEcart total={total} budget={s.budget} sombre />
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Actions */}
      <nav aria-label="Actions sur le voyage" className={`sticky top-0 z-30 print:hidden ${classeEnTeteVerre(defile)}`}>
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 py-1.5 sm:flex sm:py-2">
          {[
            { icone: Pencil, libelle: 'Modifier', action: () => navigate('/configurer') },
            {
              icone: Shuffle,
              libelle: 'Régénérer',
              action: () => {
                regenerer()
                navigate('/calcul?vers=voyage')
              },
            },
            {
              icone: Bookmark,
              libelle: 'Sauvegarder',
              action: () => {
                setNomSauvegarde(`${arrivee.nom}, ${dateMoyenne(s.dateDepart)}`)
                dialogue.current?.showModal()
              },
            },
            { icone: Share2, libelle: 'Partager', action: partager },
            { icone: Printer, libelle: 'PDF', action: () => window.print() },
          ].map(({ icone: Icone, libelle, action }) => (
            <button
              key={libelle}
              type="button"
              onClick={action}
              className="group flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold text-ocean-900 sm:h-11 sm:min-h-0 sm:flex-row sm:gap-1.5 sm:rounded-full sm:pr-3.5 sm:pl-1 sm:text-sm dark:text-ocean-50"
            >
              <span className="verre eclat grid size-10 place-items-center rounded-full [--verre-fond:0.7] transition group-hover:brightness-110 group-active:scale-95 sm:size-9 dark:[--verre-fond:0.55]">
                <Icone className="size-[1.1rem]" aria-hidden />
              </span>
              {libelle}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-5">
        {avertissements.map((a) => (
          <p key={a} className="flex items-start gap-2 rounded-2xl bg-(--statut-juste)/15 px-3 py-2 text-sm text-(--statut-juste-texte)">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {a}
          </p>
        ))}
        {!sejour && s.budget != null && couts.total > s.budget && (
          <div className="print:hidden">
            <Economies
              entree={entree}
              budget={s.budget}
              total={couts.total}
              onAppliquer={(c) => {
                appliquerChangements(c)
                navigate('/calcul?vers=voyage')
              }}
            />
          </div>
        )}

        {sejour && s.budget != null && total > s.budget && (
          <p className="flex items-start gap-2 rounded-2xl bg-(--statut-depasse)/10 px-3 py-2 text-sm text-(--statut-depasse-texte)">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Au-dessus du budget de {formatEuros(total - s.budget)}. Pistes : une colocation, une zone un peu plus loin du travail, ou moins de retours le week-end.
          </p>
        )}

        {sejour ? (
          <VueSejourLong
            budget={sejour}
            entree={entree}
            arrivee={arrivee}
            itineraire={resultat.itineraire}
            activitesWeekend={reglagesEffectifs(reglages).activitesWeekend}
            liens={donnees.liens}
            checklist={donnees.checklist}
            coche={(id) => !!coches[`${prefixeCoche}:${id}`]}
            onCocher={(id) => basculerCoche(`${prefixeCoche}:${id}`)}
          />
        ) : (
          <>
            {/* Onglets */}
            <PisteLiquide cle={onglet} role="tablist" aria-label="Sections du voyage" className={`flex gap-1 overflow-x-auto [scrollbar-width:none] print:hidden ${FOND_PISTE}`}>
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
                  data-actif={onglet === o.id}
                  aria-controls={`panneau-${o.id}`}
                  tabIndex={onglet === o.id ? 0 : -1}
                  onClick={() => setOnglet(o.id)}
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                    const j = (i + (e.key === 'ArrowRight' ? 1 : ONGLETS.length - 1)) % ONGLETS.length
                    setOnglet(ONGLETS[j].id)
                    refsOnglets.current[j]?.focus()
                  }}
                  className={`h-10 min-w-fit flex-1 shrink-0 rounded-xl px-3 text-[13px] font-semibold whitespace-nowrap sm:text-sm ${classeOnglet(onglet === o.id)}`}
                >
                  {o.libelle}
                </button>
              ))}
            </PisteLiquide>

            <div id={`panneau-${onglet}`} role="tabpanel" aria-labelledby={`onglet-${onglet}`} className="print:hidden">
              {onglet === 'itineraire' && <OngletItineraire itineraire={resultat.itineraire} ville={ville} onRemplacer={remplacer} />}
              {onglet === 'trajet' && (
                <section aria-label="Comparatif des trajets" className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Trajet retenu en premier. Touchez un autre trajet pour voir ses étapes ; « Choisir ce trajet » recalcule le voyage avec lui.
                  </p>
                  <CartesTrajets
                    resultat={donnees.trajets}
                    choisi={couts.transport.option?.type}
                    voyageurs={voyageurs}
                    detaille
                    contexte={{ aller: s.dateDepart, retour: ajouterJours(s.dateDepart, s.nuits), adultes: s.adultes, enfants: s.enfants }}
                    onChoisirDetaille={(o) => {
                      appliquerChangements({ simple: { transport: o.mode, trajetChoisi: o.type } })
                      navigate('/calcul?vers=voyage')
                    }}
                  />
                </section>
              )}
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
          </>
        )}

        <MentionDonnees className="pt-4" />
      </main>

      {message && (
        <p role="status" className="verre-sombre fixed inset-x-4 bottom-[calc(var(--nav-bas)+1rem)] z-40 mx-auto max-w-sm rounded-full px-4 py-3 text-center text-sm text-white print:hidden">
          {message}
        </p>
      )}

      <dialog
        ref={dialogue}
        aria-labelledby="titre-sauvegarde"
        className="feuille-verre verre m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[1.75rem] p-5 text-slate-900 [--verre-fond:0.9] dark:text-slate-100 dark:[--verre-fond:0.82]"
      >
        <form
          method="dialog"
          onSubmit={() => {
            const v = sauvegarder(nomSauvegarde.trim() || `${arrivee.nom}`, { total, proposition: choisie ? `${choisie.titre} · ${choisie.sousTitre}` : undefined })
            if (v) afficher('Voyage sauvegardé dans « Mes voyages ».')
          }}
        >
          <h2 id="titre-sauvegarde" className="text-lg font-semibold">
            Sauvegarder ce voyage
          </h2>
          <label htmlFor="nom-voyage" className="mt-3 block text-sm font-medium">
            Nom du voyage
          </label>
          <input
            id="nom-voyage"
            value={nomSauvegarde}
            onChange={(e) => setNomSauvegarde(e.target.value)}
            maxLength={60}
            className="mt-1 h-12 w-full rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-900/10 dark:bg-white/5 dark:ring-white/10"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => dialogue.current?.close()} className="h-11 rounded-full px-4 font-semibold text-slate-600 dark:text-slate-300">
              Annuler
            </button>
            <button type="submit" className="bouton-accent h-11 rounded-full px-5 font-semibold">
              Sauvegarder
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
