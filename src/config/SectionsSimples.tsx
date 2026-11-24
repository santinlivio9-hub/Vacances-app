import { CalendarDays, Heart, Route, Sparkles, Users, Wallet } from 'lucide-react'
import type { Interet, ModeTransport, Style } from '../domain/types'
import { ajouterJours } from '../engine/dates'
import { useVoyage, dateDuJour } from '../store/voyage'
import { formatDuree, formatEuros } from '../ui/format'
import { CarteReglage, Compteur, Curseur, Interrupteur, Puces, Reglage, Segments } from './Controles'
import { INTERETS_UI, MODES_UI, STYLES_UI } from './libelles'
import type { Estimation } from './useEstimation'

const dateLongue = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })

export function SectionsSimples({ estimation, ouvertes }: { estimation: Estimation; ouvertes: boolean }) {
  const { reglages, modifierSimple } = useVoyage()
  const s = reglages.simple
  const retour = ajouterJours(s.dateDepart, s.nuits)
  const voyageurs = s.adultes + s.enfants

  return (
    <>
      <CarteReglage titre="Quand" icone={CalendarDays} resume={`Du ${dateLongue(s.dateDepart)} au ${dateLongue(retour)}`} ouverteParDefaut={ouvertes}>
        <Reglage libelle="Date de départ" htmlFor="date-depart">
          <input
            id="date-depart"
            type="date"
            min={dateDuJour()}
            value={s.dateDepart}
            onChange={(e) => e.target.value && modifierSimple({ dateDepart: e.target.value })}
            className="h-12 w-full rounded-2xl bg-slate-50 px-4 text-base ring-1 ring-slate-900/10 dark:bg-white/5 dark:ring-white/10"
          />
        </Reglage>
        <Reglage libelle="Durée" aide={`Retour le ${dateLongue(retour)} · saison ${estimation.couts.saison} à destination`}>
          <Compteur libelle="Nombre de nuits" valeur={s.nuits} min={1} max={60} onChange={(nuits) => modifierSimple({ nuits })} unite={(n) => `${n} nuit${n > 1 ? 's' : ''}`} />
        </Reglage>
      </CarteReglage>

      <CarteReglage titre="Qui" icone={Users} resume={`${s.adultes} adulte${s.adultes > 1 ? 's' : ''}${s.enfants ? `, ${s.enfants} enfant${s.enfants > 1 ? 's' : ''}` : ''}`} ouverteParDefaut={ouvertes}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Reglage libelle="Adultes">
            <Compteur libelle="Adultes" valeur={s.adultes} min={1} max={12} onChange={(adultes) => modifierSimple({ adultes })} />
          </Reglage>
          <Reglage libelle="Enfants" aide="Moins de 12 ans">
            <Compteur libelle="Enfants" valeur={s.enfants} min={0} max={10} onChange={(enfants) => modifierSimple({ enfants })} />
          </Reglage>
        </div>
      </CarteReglage>

      <CarteReglage titre="Comment" icone={Route} resume={MODES_UI[s.transport].libelle} ouverteParDefaut={ouvertes}>
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
        <p className="text-xs text-slate-500 dark:text-slate-400">Prix aller-retour pour {voyageurs} voyageur{voyageurs > 1 ? 's' : ''}, durée d’un aller.</p>
      </CarteReglage>

      <CarteReglage titre="Style" icone={Sparkles} resume={STYLES_UI[s.style].libelle} ouverteParDefaut={ouvertes}>
        <Segments<Style>
          nom="Style de voyage"
          valeur={s.style}
          onChange={(style) => modifierSimple({ style })}
          options={(Object.keys(STYLES_UI) as Style[]).map((st) => ({ valeur: st, ...STYLES_UI[st] }))}
        />
      </CarteReglage>

      <CarteReglage titre="Intérêts" icone={Heart} resume={s.interets.map((i) => INTERETS_UI[i].libelle).join(', ') || 'Aucun'} ouverteParDefaut={ouvertes}>
        <Puces<Interet>
          nom="Centres d’intérêt"
          valeurs={s.interets}
          onChange={(interets) => modifierSimple({ interets })}
          options={(Object.keys(INTERETS_UI) as Interet[]).map((i) => ({ valeur: i, ...INTERETS_UI[i] }))}
        />
      </CarteReglage>

      <CarteReglage titre="Budget" icone={Wallet} resume={s.budget == null ? 'Pas de limite' : `${formatEuros(s.budget)} au total`} ouverteParDefaut={ouvertes}>
        <Interrupteur
          libelle="Pas de limite"
          aide="Sinon, on vous montre où économiser si l’estimation dépasse."
          valeur={s.budget == null}
          onChange={(libre) => modifierSimple({ budget: libre ? null : Math.max(300, Math.round(estimation.couts.total / 100) * 100) })}
        />
        {s.budget != null && (
          <Reglage libelle="Budget total" valeur={formatEuros(s.budget)} htmlFor="budget" aide={`Soit ${formatEuros(s.budget / voyageurs)} par personne.`}>
            <Curseur id="budget" libelle="Budget total" min={200} max={20000} pas={100} valeur={s.budget} onChange={(budget) => modifierSimple({ budget })} texte={formatEuros(s.budget)} />
          </Reglage>
        )}
      </CarteReglage>
    </>
  )
}
