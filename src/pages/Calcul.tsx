import { Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useVoyage } from '../store/voyage'
import { cleVoyage, useResultat } from '../store/resultat'
import { calculerBase, etapesDuCalcul, propositionsPour, resultatPour, type IdEtape } from '../voyage/calcul'

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Écran de calcul. Par défaut il prépare les propositions à comparer ;
 * avec « ?vers=voyage » (voyage sauvegardé, partagé, régénéré), il recalcule directement « Mon voyage ».
 */
export default function Calcul() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const versVoyage = params.get('vers') === 'voyage'
  const { depart, arrivee, reglages, graine } = useVoyage()
  const { definir, definirPropositions } = useResultat()
  const [etape, setEtape] = useState<IdEtape>('trajet')
  const [details, setDetails] = useState<Partial<Record<IdEtape, string>>>({})
  const lance = useRef(false)
  const [erreur, setErreur] = useState(false)
  const etapes = etapesDuCalcul(reglages, versVoyage)

  // Déjà calculé (retour arrière, ou rien n'a changé) : on y va directement
  const cle = depart && arrivee ? cleVoyage(depart, arrivee, reglages, graine) : null
  const etat = useResultat.getState()
  const dejaCalcule = !lance.current && !!cle && (versVoyage ? etat.resultat?.cle === cle : etat.propositions?.cle === cle)

  useEffect(() => {
    if (!depart || !arrivee || lance.current || dejaCalcule) return
    lance.current = true
    const debut = performance.now()
    const rapide = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let derniere = performance.now()
    // Chaque étape reste visible un court instant, pour qu'on voie le calcul avancer
    const affichages: Promise<void>[] = []
    const surEtape = (id: IdEtape, detail?: string) => {
      if (detail) setDetails((d) => ({ ...d, [id]: detail }))
      else {
        const attente = rapide ? 0 : Math.max(0, 280 - (performance.now() - derniere))
        derniere = performance.now() + attente
        affichages.push(pause(attente).then(() => setEtape(id)))
      }
    }
    ;(async () => {
      const base = await calculerBase(depart, arrivee, reglages, surEtape)
      surEtape('prix')
      surEtape('itineraire')
      if (versVoyage) {
        surEtape('liens')
        const resultat = resultatPour(base, depart, arrivee, reglages, graine)
        await Promise.all(affichages)
        await pause(rapide ? 0 : Math.max(250, 1200 - (performance.now() - debut)))
        definir(resultat)
        navigate('/voyage', { replace: true })
        return
      }
      surEtape('propositions')
      const r = propositionsPour(base, depart, arrivee, reglages, graine)
      surEtape('propositions', `${r.propositions.length} propositions retenues sur ${r.candidats} combinaisons`)
      await Promise.all(affichages)
      await pause(rapide ? 0 : Math.max(250, 1400 - (performance.now() - debut)))
      definirPropositions({ ...r, cle: cleVoyage(depart, arrivee, reglages, graine), reglages, graine, base, choisie: null })
      navigate('/propositions', { replace: true })
    })().catch(() => setErreur(true))
    // Pas d'annulation au démontage : en développement, React monte l'écran deux fois
    // et le garde-fou `lance` empêcherait de relancer le calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!depart || !arrivee) return <Navigate to="/" replace />
  if (dejaCalcule) return <Navigate to={versVoyage ? '/voyage' : '/propositions'} replace />

  const position = etapes.findIndex((e) => e.id === etape)
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-ocean-100 to-ocean-50 p-6 dark:from-ocean-900 dark:to-ocean-950">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold [text-wrap:balance]">
          {depart.nom} → {arrivee.nom}
        </h1>
        <p className="mt-1 text-center text-slate-600 dark:text-slate-300">{versVoyage ? 'Nous préparons votre voyage…' : 'Nous comparons plusieurs façons de partir…'}</p>
        <ol className="verre mt-6 space-y-1 rounded-3xl p-3 [--verre-fond:0.9]" aria-live="polite">
          {etapes.map((e, i) => {
            const fait = i < position
            const enCours = i === position
            return (
              <motion.li key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex items-start gap-3 rounded-2xl px-2 py-2.5">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full transition-colors ${fait ? 'bg-(--statut-ok) text-white' : enCours ? 'bg-ocean-100 text-ocean-700 dark:bg-ocean-800 dark:text-ocean-100' : 'bg-slate-900/5 text-slate-400 dark:bg-white/10'}`}
                  aria-hidden
                >
                  {fait ? <Check className="size-4" strokeWidth={3} /> : enCours ? <Loader2 className="size-4 animate-spin" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm ${fait || enCours ? 'font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {e.libelle}
                    <span className="sr-only">{fait ? ' : terminé' : enCours ? ' : en cours' : ''}</span>
                  </span>
                  {details[e.id] && (fait || enCours) && <span className="block text-xs text-slate-500 dark:text-slate-400">{details[e.id]}</span>}
                </span>
              </motion.li>
            )
          })}
        </ol>
        {erreur && (
          <div role="alert" className="mt-4 rounded-2xl bg-white p-4 text-center text-sm shadow dark:bg-slate-900">
            <p>Le calcul n’a pas pu aboutir. Vérifiez votre connexion puis réessayez.</p>
            <button type="button" onClick={() => location.reload()} className="mt-3 h-11 rounded-full bg-ocean-700 px-5 font-semibold text-white">
              Réessayer
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
