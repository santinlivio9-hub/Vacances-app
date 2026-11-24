import { BedDouble, Briefcase, CalendarDays, CalendarRange, Heart, Route, Sparkles, Users, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import type { FrequenceRetour, Interet, ModeTransport, Style, TypeLogement } from '../domain/types'
import { ajouterJours } from '../engine/dates'
import { NOMS_MOIS } from '../engine/periodes'
import { typeVoyage, type IdSectionSimple } from '../tripTypes'
import { useVoyage, dateDuJour } from '../store/voyage'
import { formatDuree, formatEuros } from '../ui/format'
import { CarteReglage, Compteur, Curseur, Interrupteur, Puces, Reglage, Segments } from './Controles'
import { INTERETS_UI, LOGEMENTS_UI, MODES_UI, STYLES_UI } from './libelles'
import type { Estimation } from './useEstimation'

const dateLongue = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
const dateCourte = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const champ = 'h-12 w-full rounded-2xl bg-slate-50 px-4 text-base ring-1 ring-slate-900/10 dark:bg-white/5 dark:ring-white/10'

/** Durées proposées pour les dates flexibles (en nuits). */
const DUREES = [
  { id: '3-4', libelle: 'Week-end prolongé', detail: '3 à 4 nuits', min: 3, max: 4 },
  { id: '6-8', libelle: 'Une semaine', detail: '6 à 8 nuits', min: 6, max: 8 },
  { id: '7-14', libelle: '1 à 2 semaines', detail: '7 à 14 nuits', min: 7, max: 14 },
  { id: '14-21', libelle: '2 à 3 semaines', detail: '14 à 21 nuits', min: 14, max: 21 },
]

export const resumeDurees = (min: number, max: number) => {
  const d = DUREES.find((x) => x.min === min && x.max === max)
  return d ? d.libelle : min === max ? `${min} nuits` : `${min} à ${max} nuits`
}

export function SectionsSimples({ estimation, ouvertes }: { estimation: Estimation; ouvertes: boolean }) {
  const { reglages, modifierSimple } = useVoyage()
  const s = reglages.simple
  const def = typeVoyage(s)
  const retour = ajouterJours(s.dateDepart, s.nuits)
  const voyageurs = s.adultes + s.enfants
  const f = s.flexible
  const st = s.stage
  const semaines = Math.round((s.nuits / 7) * 10) / 10

  const sections: Record<IdSectionSimple, () => ReactNode> = {
    quand: () => (
      <CarteReglage key="quand" titre="Quand" icone={CalendarDays} resume={`Du ${dateLongue(s.dateDepart)} au ${dateLongue(retour)}`} ouverteParDefaut={ouvertes}>
        <Reglage libelle="Date de départ" htmlFor="date-depart">
          <input id="date-depart" type="date" min={dateDuJour()} value={s.dateDepart} onChange={(e) => e.target.value && modifierSimple({ dateDepart: e.target.value })} className={champ} />
        </Reglage>
        <Reglage libelle="Durée" aide={`Retour le ${dateLongue(retour)} · saison ${estimation.couts.saison} à destination`}>
          <Compteur
            libelle="Nombre de nuits"
            valeur={s.nuits}
            min={1}
            max={s.typeVoyage === 'weekend' ? 2 : 60}
            onChange={(nuits) => modifierSimple({ nuits })}
            unite={(n) => `${n} nuit${n > 1 ? 's' : ''}`}
          />
        </Reglage>
      </CarteReglage>
    ),

    periode: () => (
      <CarteReglage
        key="periode"
        titre="Durée et période"
        icone={CalendarRange}
        resume={`${resumeDurees(f.dureeMin, f.dureeMax)}, ${f.moisDebut == null ? 'peu importe quand' : `de ${NOMS_MOIS[f.moisDebut - 1]} à ${NOMS_MOIS[(f.moisFin ?? f.moisDebut) - 1]}`}`}
        ouverteParDefaut={ouvertes}
      >
        <Reglage libelle="Combien de temps ?">
          <Segments<string>
            nom="Durée souple"
            valeur={`${f.dureeMin}-${f.dureeMax}`}
            onChange={(id) => {
              const d = DUREES.find((x) => x.id === id)!
              modifierSimple({ flexible: { ...f, dureeMin: d.min, dureeMax: d.max } })
            }}
            options={DUREES.map((d) => ({ valeur: d.id, libelle: d.libelle, detail: d.detail }))}
          />
        </Reglage>
        <div className="grid gap-5 sm:grid-cols-2">
          <Reglage libelle="Au moins">
            <Compteur libelle="Durée minimum" valeur={f.dureeMin} min={1} max={60} onChange={(dureeMin) => modifierSimple({ flexible: { ...f, dureeMin, dureeMax: Math.max(dureeMin, f.dureeMax) } })} unite={(n) => `${n} nuit${n > 1 ? 's' : ''}`} />
          </Reglage>
          <Reglage libelle="Au plus">
            <Compteur libelle="Durée maximum" valeur={f.dureeMax} min={f.dureeMin} max={60} onChange={(dureeMax) => modifierSimple({ flexible: { ...f, dureeMax } })} unite={(n) => `${n} nuit${n > 1 ? 's' : ''}`} />
          </Reglage>
        </div>
        <Interrupteur
          libelle="Peu importe quand"
          aide="Nous testons les 12 prochains mois et gardons les 3 moins chers."
          valeur={f.moisDebut == null}
          onChange={(libre) => {
            const m = Number(s.dateDepart.slice(5, 7))
            modifierSimple({ flexible: { ...f, moisDebut: libre ? null : m, moisFin: libre ? null : ((m + 1) % 12) + 1 } })
          }}
        />
        {f.moisDebut != null && (
          <div className="grid grid-cols-2 gap-3">
            {(['moisDebut', 'moisFin'] as const).map((cle) => (
              <Reglage key={cle} libelle={cle === 'moisDebut' ? 'Entre' : 'et'} htmlFor={cle}>
                <select id={cle} value={f[cle] ?? 1} onChange={(e) => modifierSimple({ flexible: { ...f, [cle]: Number(e.target.value) } })} className={champ}>
                  {NOMS_MOIS.map((nom, i) => (
                    <option key={nom} value={i + 1}>
                      {nom.charAt(0).toUpperCase() + nom.slice(1)}
                    </option>
                  ))}
                </select>
              </Reglage>
            ))}
          </div>
        )}
      </CarteReglage>
    ),

    stage: () => (
      <CarteReglage key="stage" titre="Stage" icone={Briefcase} resume={`${semaines.toLocaleString('fr-FR')} semaines, du ${dateCourte(s.dateDepart)} au ${dateCourte(st.dateFin)}`} ouverteParDefaut={ouvertes}>
        <div className="grid grid-cols-2 gap-3">
          <Reglage libelle="Début" htmlFor="stage-debut">
            <input id="stage-debut" type="date" min={dateDuJour()} value={s.dateDepart} onChange={(e) => e.target.value && modifierSimple({ dateDepart: e.target.value })} className={champ} />
          </Reglage>
          <Reglage libelle="Fin" htmlFor="stage-fin">
            <input id="stage-fin" type="date" min={ajouterJours(s.dateDepart, 14)} value={st.dateFin} onChange={(e) => e.target.value && modifierSimple({ stage: { ...st, dateFin: e.target.value } })} className={champ} />
          </Reglage>
        </div>
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          {s.nuits} nuits, soit {semaines.toLocaleString('fr-FR')} semaines (≈ {(s.nuits / 30.44).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} mois).
        </p>
        <Reglage libelle="Jours travaillés par semaine">
          <Compteur libelle="Jours travaillés" valeur={st.joursParSemaine} min={1} max={7} onChange={(joursParSemaine) => modifierSimple({ stage: { ...st, joursParSemaine } })} unite={(n) => `${n} jour${n > 1 ? 's' : ''}`} />
        </Reglage>
        <div className="grid grid-cols-2 gap-3">
          <Reglage libelle="Arrivée au travail" htmlFor="heure-debut">
            <input id="heure-debut" type="time" value={st.heureDebut} onChange={(e) => e.target.value && modifierSimple({ stage: { ...st, heureDebut: e.target.value } })} className={champ} />
          </Reglage>
          <Reglage libelle="Départ du travail" htmlFor="heure-fin">
            <input id="heure-fin" type="time" value={st.heureFin} onChange={(e) => e.target.value && modifierSimple({ stage: { ...st, heureFin: e.target.value } })} className={champ} />
          </Reglage>
        </div>
        <Reglage libelle="Temps de trajet maximum accepté" aide="Sert à dessiner les zones de logement autour du lieu de travail.">
          <Segments<number>
            nom="Temps de trajet maximum"
            valeur={st.trajetMaxMin}
            onChange={(trajetMaxMin) => modifierSimple({ stage: { ...st, trajetMaxMin } })}
            colonnes="grid-cols-5"
            options={[15, 20, 30, 45, 60].map((m) => ({ valeur: m, libelle: `${m} min` }))}
          />
        </Reglage>
        <Reglage libelle="Rentrer chez soi le week-end">
          <Segments<FrequenceRetour>
            nom="Allers-retours le week-end"
            valeur={st.retours}
            onChange={(retours) => modifierSimple({ stage: { ...st, retours } })}
            options={[
              { valeur: 'jamais', libelle: 'Jamais' },
              { valeur: 'deux', libelle: '1 sur 2' },
              { valeur: 'chaque', libelle: 'Chaque week-end' },
            ]}
          />
        </Reglage>
      </CarteReglage>
    ),

    qui: () => (
      <CarteReglage key="qui" titre="Qui" icone={Users} resume={`${s.adultes} adulte${s.adultes > 1 ? 's' : ''}${s.enfants ? `, ${s.enfants} enfant${s.enfants > 1 ? 's' : ''}` : ''}`} ouverteParDefaut={ouvertes}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Reglage libelle="Adultes">
            <Compteur libelle="Adultes" valeur={s.adultes} min={1} max={12} onChange={(adultes) => modifierSimple({ adultes })} />
          </Reglage>
          <Reglage libelle="Enfants" aide="Moins de 12 ans">
            <Compteur libelle="Enfants" valeur={s.enfants} min={0} max={10} onChange={(enfants) => modifierSimple({ enfants })} />
          </Reglage>
        </div>
      </CarteReglage>
    ),

    comment: () => (
      <CarteReglage key="comment" titre={s.typeVoyage === 'stage' ? 'Pour y aller' : 'Comment'} icone={Route} resume={MODES_UI[s.transport].libelle} ouverteParDefaut={ouvertes}>
        <Segments<ModeTransport>
          nom="Mode de transport"
          valeur={s.transport}
          onChange={(transport) => modifierSimple({ transport })}
          options={(Object.keys(MODES_UI) as ModeTransport[]).map((m) => {
            const e = estimation.parMode[m]
            return {
              valeur: m,
              libelle: MODES_UI[m].libelle,
              icone: MODES_UI[m].icone,
              detail: e.possible ? `${formatEuros(e.total)} · ${formatDuree(e.dureeAllerMin)}` : 'Impossible',
              titre: e.raison,
            }
          })}
        />
        {!estimation.parMode[s.transport].possible && (
          <p role="alert" className="rounded-2xl bg-(--statut-depasse)/10 px-3 py-2 text-sm text-(--statut-depasse-texte)">
            {estimation.parMode[s.transport].raison} Choisissez un autre mode.
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Prix aller-retour pour {voyageurs} voyageur{voyageurs > 1 ? 's' : ''}, durée d’un aller.
          {def.calcul !== 'sejourLong' && ' Les autres modes possibles seront aussi comparés.'}
        </p>
      </CarteReglage>
    ),

    style: () => (
      <CarteReglage key="style" titre="Style" icone={Sparkles} resume={STYLES_UI[s.style].libelle} ouverteParDefaut={ouvertes}>
        <Segments<Style> nom="Style de voyage" valeur={s.style} onChange={(style) => modifierSimple({ style })} options={(Object.keys(STYLES_UI) as Style[]).map((x) => ({ valeur: x, ...STYLES_UI[x] }))} />
      </CarteReglage>
    ),

    logements: () => (
      <CarteReglage key="logements" titre="Où dormir" icone={BedDouble} resume={s.logements.map((l) => LOGEMENTS_UI[l].libelle).join(', ')} ouverteParDefaut={ouvertes}>
        <Puces<TypeLogement>
          nom="Types de logement à comparer"
          valeurs={s.logements}
          onChange={(logements) => logements.length > 0 && modifierSimple({ logements })}
          options={def.logementsPossibles.map((l) => ({ valeur: l, ...LOGEMENTS_UI[l] }))}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cochez-en plusieurs : chaque type est calculé et comparé dans vos propositions.{s.typeVoyage === 'stage' ? ' Prix au mois, réductions séjour long comprises.' : ''}
        </p>
      </CarteReglage>
    ),

    interets: () => (
      <CarteReglage key="interets" titre="Intérêts" icone={Heart} resume={s.interets.map((i) => INTERETS_UI[i].libelle).join(', ') || 'Aucun'} ouverteParDefaut={ouvertes}>
        <Puces<Interet> nom="Centres d’intérêt" valeurs={s.interets} onChange={(interets) => modifierSimple({ interets })} options={(Object.keys(INTERETS_UI) as Interet[]).map((i) => ({ valeur: i, ...INTERETS_UI[i] }))} />
      </CarteReglage>
    ),

    budget: () => (
      <CarteReglage key="budget" titre="Budget" icone={Wallet} resume={s.budget == null ? 'Pas de limite' : `${formatEuros(s.budget)} au total`} ouverteParDefaut={ouvertes}>
        <Interrupteur
          libelle="Pas de limite"
          aide="Sinon, on vous montre où économiser si l’estimation dépasse."
          valeur={s.budget == null}
          onChange={(libre) => modifierSimple({ budget: libre ? null : Math.max(300, Math.round(estimation.total / 100) * 100) })}
        />
        {s.budget != null && (
          <Reglage libelle={s.typeVoyage === 'stage' ? 'Budget pour tout le séjour' : 'Budget total'} valeur={formatEuros(s.budget)} htmlFor="budget" aide={`Soit ${formatEuros(s.budget / voyageurs)} par personne${s.typeVoyage === 'stage' ? `, ou ${formatEuros(s.budget / Math.max(0.25, s.nuits / 30.44))} par mois` : ''}.`}>
            <Curseur id="budget" libelle="Budget total" min={200} max={s.typeVoyage === 'stage' ? 40000 : 20000} pas={100} valeur={s.budget} onChange={(budget) => modifierSimple({ budget })} texte={formatEuros(s.budget)} />
          </Reglage>
        )}
      </CarteReglage>
    ),
  }

  return <>{def.sectionsSimples.map((id) => sections[id]())}</>
}
