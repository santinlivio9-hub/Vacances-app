import { ArrowLeft, Info, MapPin, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { BarreEstimation } from '../config/BarreEstimation'
import { ChoixTypeVoyage, TypeVoyageCompact } from '../config/ChoixTypeVoyage'
import { typeVoyage } from '../tripTypes'
import { MODES_UI } from '../config/libelles'
import { SectionsAvancees } from '../config/SectionsAvancees'
import { SectionsSimples } from '../config/SectionsSimples'
import { useEstimation } from '../config/useEstimation'
import { useVoyage } from '../store/voyage'
import { repartitionDuTotal } from '../engine/repartition'
import { formatKm } from '../ui/format'
import { MentionDonnees } from '../ui/MentionDonnees'
import { PisteLiquide, classeOnglet, FOND_PISTE } from '../ui/glass'

export default function Configurer() {
  const navigate = useNavigate()
  const { depart, arrivee, reglages, modeAvance, basculerModeAvance, reinitialiserTousLesAvances, typeChoisi, choisirTypeVoyage } = useVoyage()
  const estimation = useEstimation()
  const nbModifies = Object.keys(reglages.modifies).length
  const enregistrerBrouillon = useVoyage((s) => s.enregistrerBrouillon)
  // En quittant la configuration sans calculer, le voyage est gardé dans « Brouillons »
  const versCalcul = useRef(false)
  useEffect(
    () => () => {
      if (!versCalcul.current) enregistrerBrouillon()
    },
    [enregistrerBrouillon],
  )

  const repartition = estimation ? repartitionDuTotal(estimation.couts.postes, estimation.total, reglages.simple) : null

  if (!depart || !arrivee || !estimation || !repartition) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <MapPin className="size-10 text-ocean-600" aria-hidden />
        <h1 className="text-xl font-bold">Choisissez d’abord votre trajet</h1>
        <p className="text-slate-600 dark:text-slate-300">Indiquez un départ et une arrivée sur la carte pour configurer votre voyage.</p>
        <Link to="/" className="rounded-2xl bg-ocean-700 px-5 py-3 font-semibold text-white">
          Aller à la carte
        </Link>
      </main>
    )
  }

  const { itineraire, couts } = estimation
  const transportImpossible = !couts.transport.possible
  const def = typeVoyage(reglages.simple)

  // Première étape : choisir le type de voyage, avec de grandes cartes
  if (!typeChoisi) {
    return (
      <div className="min-h-dvh pb-8">
        <EnTete depart={depart.nom} arrivee={arrivee.nom} sousTitre={`${formatKm(itineraire.genre === 'vol' ? itineraire.distanceVolKm : itineraire.distanceRouteKm)} · ${couts.pays.nom}`} />
        <main className="mx-auto max-w-2xl px-3 pt-5">
          <h2 className="text-2xl font-bold [text-wrap:balance]">Quel genre de voyage ?</h2>
          <p className="mt-1 mb-4 text-slate-600 dark:text-slate-300">Les questions et le calcul s’adaptent à votre choix. Vous pourrez en changer ensuite.</p>
          <ChoixTypeVoyage valeur={null} onChoisir={choisirTypeVoyage} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh pb-[calc(10rem+env(safe-area-inset-bottom))]">
      <EnTete
        depart={depart.nom}
        arrivee={def.calcul === 'sejourLong' ? `${arrivee.nom} (lieu de travail)` : arrivee.nom}
        sousTitre={`${formatKm(itineraire.genre === 'vol' ? itineraire.distanceVolKm : itineraire.distanceRouteKm)} · conseillé : ${MODES_UI[itineraire.mode].libelle.toLowerCase()} · ${couts.pays.nom}`}
      />

      <main className="mx-auto max-w-2xl space-y-3 px-3 pt-4">
        <TypeVoyageCompact valeur={reglages.simple.typeVoyage} onChoisir={choisirTypeVoyage} />
        {/* Interrupteur Simple / Avancé */}
        <div className="flex items-center gap-3">
          <PisteLiquide cle={modeAvance} role="radiogroup" aria-label="Niveau de détail" className={`grid flex-1 grid-cols-2 ${FOND_PISTE}`}>
            {[
              { avance: false, libelle: 'Simple' },
              { avance: true, libelle: 'Avancé' },
            ].map((o) => (
              <button
                key={o.libelle}
                type="button"
                role="radio"
                aria-checked={modeAvance === o.avance}
                data-actif={modeAvance === o.avance}
                onClick={() => modeAvance !== o.avance && basculerModeAvance()}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${classeOnglet(modeAvance === o.avance)}`}
              >
                {o.avance && <SlidersHorizontal className="size-4" aria-hidden />}
                {o.libelle}
              </button>
            ))}
          </PisteLiquide>
        </div>
        {modeAvance ? (
          <p className="flex items-start gap-2 px-1 text-sm text-slate-600 dark:text-slate-300">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Les réglages détaillés sont déduits de vos réponses simples. Ceux que vous changez sont marqués d’un point orange.
              {nbModifies > 0 && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={reinitialiserTousLesAvances}
                    className="inline-flex items-center gap-1 font-medium text-ocean-700 underline-offset-2 hover:underline dark:text-ocean-300"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Tout réinitialiser ({nbModifies})
                  </button>
                </>
              )}
            </span>
          </p>
        ) : (
          nbModifies > 0 && (
            <p className="px-1 text-sm text-slate-600 dark:text-slate-300">
              {nbModifies} réglage{nbModifies > 1 ? 's' : ''} avancé
              {nbModifies > 1 ? 's' : ''} personnalisé
              {nbModifies > 1 ? 's' : ''} restent appliqués.
            </p>
          )
        )}

        {[...(estimation.sejourLong?.avertissements ?? couts.avertissements), ...(estimation.periodes?.alerte ? [estimation.periodes.alerte] : [])]
          .filter((a, i, t) => a !== couts.transport.raison && t.indexOf(a) === i)
          .map((a) => (
            <p key={a} className="flex items-start gap-2 rounded-2xl bg-(--statut-juste)/15 px-3 py-2 text-sm text-(--statut-juste-texte)">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {a}
            </p>
          ))}

        <SectionsSimples estimation={estimation} ouvertes={!modeAvance} />
        {modeAvance && <SectionsAvancees estimation={estimation} />}

        <MentionDonnees className="px-1 pt-2" />
      </main>

      <BarreEstimation
        total={estimation.total}
        parPersonne={estimation.parPersonne}
        libelle={estimation.libelle}
        precision={estimation.precision}
        fourchette={estimation.fourchette}
        parts={repartition.ok ? repartition.parts : undefined}
        budget={reglages.simple.budget}
        provisoire={estimation.provisoire}
        bloque={transportImpossible ? 'Choisissez un mode de transport possible pour ce trajet.' : null}
        onCalculer={() => {
          versCalcul.current = true
          navigate('/calcul')
        }}
      />
    </div>
  )
}

function EnTete({ depart, arrivee, sousTitre }: { depart: string; arrivee: string; sousTitre: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-900/5 bg-ocean-50 dark:border-white/10 dark:bg-[#071433]">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2">
        <Link to="/" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10" aria-label="Retour à la carte">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">
            {depart} → {arrivee}
          </h1>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{sousTitre}</p>
        </div>
      </div>
    </header>
  )
}
