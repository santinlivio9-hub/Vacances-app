import { BedDouble, Coins, Luggage, Ticket, UtensilsCrossed } from 'lucide-react'
import type { CleAvancee, ClasseVoyage, NiveauResto, Quartier, ReglagesAvances, RepartitionBudget, Rythme, TransportLocal, TypeActivite, TypeLogement } from '../domain/types'
import { ajusterRepartition, estModifie, reglagesEffectifs } from '../engine/reglages'
import { useVoyage } from '../store/voyage'
import { formatEuros } from '../ui/format'
import { CarteReglage, Compteur, Curseur, Interrupteur, Reglage, Segments } from './Controles'
import { ACTIVITES_UI, SECTIONS_AVANCEES, TRANSPORT_LOCAL_UI } from './libelles'
import type { Estimation } from './useEstimation'

const pourcent = (v: number) => `${Math.round(v * 100)} %`

function useAvance() {
  const { reglages, modifierAvance, reinitialiserAvance } = useVoyage()
  const av = reglagesEffectifs(reglages)
  return {
    av,
    simple: reglages.simple,
    /** Propriétés communes : modifié ? + bouton de réinitialisation */
    etat: (cle: CleAvancee) => ({ modifie: estModifie(reglages, cle), onReinitialiser: () => reinitialiserAvance(cle) }),
    changer: <K extends CleAvancee>(cle: K) => (valeur: ReglagesAvances[K]) => modifierAvance(cle, valeur),
    modifiesDans: (cles: readonly CleAvancee[]) => cles.filter((c) => estModifie(reglages, c)).length,
    reinitialiserSection: (cles: readonly CleAvancee[]) => () => cles.forEach((c) => reinitialiserAvance(c)),
  }
}

export function SectionsAvancees({ estimation }: { estimation: Estimation }) {
  const { av, simple, etat, changer, modifiesDans, reinitialiserSection } = useAvance()
  const mode = simple.transport
  const section = (cles: readonly CleAvancee[]) => ({ modifies: modifiesDans(cles), onReinitialiser: reinitialiserSection(cles), ouverteParDefaut: false })
  const p = estimation.couts.postes

  return (
    <>
      <CarteReglage titre="Transport" icone={Luggage} resume={`${formatEuros(p.transport + p.transportLocal)} · sur place : ${TRANSPORT_LOCAL_UI[av.transportLocal].libelle.toLowerCase()}`} {...section(SECTIONS_AVANCEES.transport)}>
        {mode === 'voiture' && (
          <>
            <Reglage libelle="Nombre de véhicules" {...etat('vehicules')}>
              <Compteur libelle="Véhicules" valeur={av.vehicules} min={1} max={6} onChange={changer('vehicules')} />
            </Reglage>
            <Reglage libelle="Consommation" valeur={`${av.consommationL100.toLocaleString('fr-FR')} L/100 km`} htmlFor="conso" {...etat('consommationL100')}>
              <Curseur id="conso" libelle="Consommation" min={3} max={12} pas={0.5} valeur={av.consommationL100} onChange={changer('consommationL100')} />
            </Reglage>
            <Reglage libelle="Prix du carburant" valeur={`${av.prixCarburant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €/L`} htmlFor="carburant" {...etat('prixCarburant')}>
              <Curseur id="carburant" libelle="Prix du carburant" min={1.4} max={2.6} pas={0.05} valeur={av.prixCarburant} onChange={changer('prixCarburant')} />
            </Reglage>
            <Interrupteur libelle="Autoroutes à péage" valeur={av.peages} onChange={changer('peages')} {...etat('peages')} />
          </>
        )}
        {(mode === 'train' || mode === 'avion') && (
          <Reglage libelle="Classe" {...etat('classe')}>
            <Segments<ClasseVoyage>
              nom="Classe"
              valeur={av.classe}
              onChange={changer('classe')}
              options={[
                { valeur: 'eco', libelle: mode === 'train' ? '2de classe' : 'Économique' },
                { valeur: 'premium', libelle: mode === 'train' ? '1re classe' : 'Premium' },
                { valeur: 'premiere', libelle: mode === 'train' ? 'Business' : 'Affaires' },
              ]}
            />
          </Reglage>
        )}
        {mode === 'avion' && <Interrupteur libelle="Bagages en soute" aide="Un bagage par personne et par trajet" valeur={av.bagagesSoute} onChange={changer('bagagesSoute')} {...etat('bagagesSoute')} />}
        <Reglage libelle="Pour se déplacer sur place" {...etat('transportLocal')}>
          <Segments<TransportLocal>
            nom="Transport sur place"
            valeur={av.transportLocal}
            onChange={changer('transportLocal')}
            options={(Object.keys(TRANSPORT_LOCAL_UI) as TransportLocal[]).map((t) => ({ valeur: t, ...TRANSPORT_LOCAL_UI[t] }))}
          />
        </Reglage>
      </CarteReglage>

      <CarteReglage titre="Logement" icone={BedDouble} resume={`${formatEuros(p.logement)} · ${estimation.couts.details.logement[0]?.libelle ?? ''}`} {...section(SECTIONS_AVANCEES.logement)}>
        <Reglage libelle="Type de logement" {...etat('typeLogement')}>
          <Segments<TypeLogement>
            nom="Type de logement"
            valeur={av.typeLogement}
            onChange={changer('typeLogement')}
            options={[
              { valeur: 'hotel', libelle: 'Hôtel' },
              { valeur: 'appartement', libelle: 'Appartement' },
              { valeur: 'auberge', libelle: 'Auberge' },
              { valeur: 'camping', libelle: 'Camping' },
            ]}
          />
        </Reglage>
        {av.typeLogement === 'hotel' && (
          <Reglage libelle="Catégorie" {...etat('etoiles')}>
            <Segments<2 | 3 | 4>
              nom="Étoiles"
              valeur={av.etoiles}
              onChange={changer('etoiles')}
              options={[2, 3, 4].map((e) => ({ valeur: e as 2 | 3 | 4, libelle: `${'★'.repeat(e)}`, detail: `${e} étoiles` }))}
            />
          </Reglage>
        )}
        {(av.typeLogement === 'hotel' || av.typeLogement === 'appartement') && (
          <Reglage libelle={av.typeLogement === 'hotel' ? 'Chambres' : 'Logements'} {...etat('chambres')}>
            <Compteur libelle={av.typeLogement === 'hotel' ? 'Chambres' : 'Logements'} valeur={av.chambres} min={1} max={10} onChange={changer('chambres')} />
          </Reglage>
        )}
        <Reglage libelle="Quartier" {...etat('quartier')}>
          <Segments<Quartier>
            nom="Quartier"
            valeur={av.quartier}
            onChange={changer('quartier')}
            colonnes="grid-cols-2"
            options={[
              { valeur: 'centre', libelle: 'Centre', detail: '+15 %' },
              { valeur: 'calme', libelle: 'Plus calme', detail: '−8 %' },
            ]}
          />
        </Reglage>
        {av.typeLogement !== 'camping' && <Interrupteur libelle="Petit-déjeuner inclus" valeur={av.petitDejeuner} onChange={changer('petitDejeuner')} {...etat('petitDejeuner')} />}
      </CarteReglage>

      <CarteReglage titre="Repas" icone={UtensilsCrossed} resume={`${formatEuros(p.repas)} · ${estimation.couts.details.repas[0]?.libelle.replace(/^.*\((.*)\)$/, '$1') ?? ''}`} {...section(SECTIONS_AVANCEES.repas)}>
        <Reglage libelle="Repas au restaurant, les jours où vous sortez" {...etat('restosParJour')}>
          <Compteur libelle="Restaurants par jour" valeur={av.restosParJour} min={0} max={2} onChange={changer('restosParJour')} unite={(n) => (n === 0 ? 'aucun' : `${n} par jour`)} />
        </Reglage>
        {av.restosParJour > 0 && (
          <Reglage libelle="Jours avec restaurant" valeur={pourcent(av.partRestaurant)} htmlFor="part-resto" aide="Les autres repas : courses, pique-nique ou snack." {...etat('partRestaurant')}>
            <Curseur id="part-resto" libelle="Jours avec restaurant" min={0} max={1} pas={0.05} valeur={Math.min(1, av.partRestaurant)} onChange={changer('partRestaurant')} texte={pourcent(av.partRestaurant)} />
          </Reglage>
        )}
        <Reglage libelle="Niveau des restaurants" {...etat('niveauResto')}>
          <Segments<NiveauResto>
            nom="Niveau des restaurants"
            valeur={av.niveauResto}
            onChange={changer('niveauResto')}
            options={[
              { valeur: 'simple', libelle: 'Simple', detail: '≈ 18 €' },
              { valeur: 'moyen', libelle: 'Bistrot', detail: '≈ 30 €' },
              { valeur: 'gastronomique', libelle: 'Gastro', detail: '≈ 65 €' },
            ]}
          />
        </Reglage>
        <p className="text-xs text-slate-500 dark:text-slate-400">Prix par adulte en France, ajustés au coût de la vie à destination ({estimation.couts.pays.nom}).</p>
      </CarteReglage>

      <CarteReglage titre="Activités" icone={Ticket} resume={`${formatEuros(p.activites)} · ${['', 'tranquille', 'équilibré', 'intense'][av.rythme]}`} {...section(SECTIONS_AVANCEES.activites)}>
        <Reglage libelle="Rythme" {...etat('rythme')}>
          <Segments<Rythme>
            nom="Rythme"
            valeur={av.rythme}
            onChange={changer('rythme')}
            options={[
              { valeur: 1, libelle: 'Tranquille', detail: '1 par jour' },
              { valeur: 2, libelle: 'Équilibré', detail: '2 par jour' },
              { valeur: 3, libelle: 'Intense', detail: '3 par jour' },
            ]}
          />
        </Reglage>
        <Interrupteur libelle="Garder du temps libre" aide="Une demi-journée sans programme de temps en temps" valeur={av.tempsLibre} onChange={changer('tempsLibre')} {...etat('tempsLibre')} />
        <Interrupteur libelle="Activités gratuites uniquement" valeur={av.gratuitesUniquement} onChange={changer('gratuitesUniquement')} {...etat('gratuitesUniquement')} />
        {!av.gratuitesUniquement && (
          <Reglage libelle="Prix maximum par activité" valeur={av.budgetMaxActivite == null ? 'Pas de limite' : formatEuros(av.budgetMaxActivite)} htmlFor="max-activite" {...etat('budgetMaxActivite')}>
            <Curseur
              id="max-activite"
              libelle="Prix maximum par activité"
              min={5}
              max={105}
              pas={5}
              valeur={av.budgetMaxActivite ?? 105}
              onChange={(v) => changer('budgetMaxActivite')(v > 100 ? null : v)}
              texte={av.budgetMaxActivite == null ? 'Pas de limite' : formatEuros(av.budgetMaxActivite)}
            />
          </Reglage>
        )}
        <Reglage
          libelle="Types d’activités"
          aide="Touchez une fois pour privilégier (♥), deux fois pour exclure (✕)."
          modifie={etat('activitesIncluses').modifie || etat('activitesExclues').modifie}
          onReinitialiser={() => {
            etat('activitesIncluses').onReinitialiser()
            etat('activitesExclues').onReinitialiser()
          }}
        >
          <div className="flex flex-wrap gap-2" role="group" aria-label="Types d’activités">
            {(Object.keys(ACTIVITES_UI) as TypeActivite[]).filter((t) => t !== 'autre').map((t) => {
              const inclus = av.activitesIncluses.includes(t)
              const exclu = av.activitesExclues.includes(t)
              const suivant = () => {
                if (!inclus && !exclu) changer('activitesIncluses')([...av.activitesIncluses, t])
                else if (inclus) {
                  changer('activitesIncluses')(av.activitesIncluses.filter((x) => x !== t))
                  changer('activitesExclues')([...av.activitesExclues, t])
                } else changer('activitesExclues')(av.activitesExclues.filter((x) => x !== t))
              }
              return (
                <button
                  key={t}
                  type="button"
                  onClick={suivant}
                  aria-label={`${ACTIVITES_UI[t].libelle} : ${inclus ? 'privilégié' : exclu ? 'exclu' : 'neutre'}`}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm ring-1 transition ${
                    inclus
                      ? 'bg-ocean-700 font-semibold text-white ring-ocean-700'
                      : exclu
                        ? 'bg-slate-100 text-slate-500 line-through ring-slate-300 dark:bg-white/5 dark:text-slate-400 dark:ring-white/15'
                        : 'bg-white text-slate-700 ring-slate-900/10 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10'
                  }`}
                >
                  <span aria-hidden>{inclus ? '♥' : exclu ? '✕' : ''}</span>
                  {ACTIVITES_UI[t].libelle}
                </button>
              )
            })}
          </div>
        </Reglage>
      </CarteReglage>

      <CarteReglage titre="Budget et divers" icone={Coins} resume={`${formatEuros(p.divers + p.imprevus)} · imprévus ${pourcent(av.tauxImprevus)}`} {...section(SECTIONS_AVANCEES.divers)}>
        <Reglage libelle="Marge pour imprévus" valeur={pourcent(av.tauxImprevus)} htmlFor="imprevus" {...etat('tauxImprevus')}>
          <Curseur id="imprevus" libelle="Marge pour imprévus" min={0} max={0.3} pas={0.01} valeur={av.tauxImprevus} onChange={changer('tauxImprevus')} texte={pourcent(av.tauxImprevus)} />
        </Reglage>
        <Interrupteur libelle="Assurance voyage" aide="≈ 3 € par personne et par jour" valeur={av.assurance} onChange={changer('assurance')} {...etat('assurance')} />
        <Interrupteur libelle="Souvenirs et petits achats" valeur={av.souvenirs} onChange={changer('souvenirs')} {...etat('souvenirs')} />
        {simple.budget != null && (
          <Reglage
            libelle="Répartition idéale du budget"
            aide="Sert à proposer des économies ciblées si l’estimation dépasse votre budget."
            {...etat('repartition')}
          >
            <div className="space-y-1">
              {(['transport', 'logement', 'repas', 'activites'] as (keyof RepartitionBudget)[]).map((cle) => (
                <div key={cle} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-slate-600 capitalize dark:text-slate-300">{cle === 'activites' ? 'Activités' : cle}</span>
                  <Curseur
                    libelle={`Part ${cle}`}
                    min={0.05}
                    max={0.7}
                    pas={0.01}
                    valeur={av.repartition[cle]}
                    onChange={(v) => changer('repartition')(ajusterRepartition(av.repartition, cle, v))}
                    texte={pourcent(av.repartition[cle])}
                  />
                  <span className="w-11 shrink-0 text-right text-sm font-semibold tabular-nums">{pourcent(av.repartition[cle])}</span>
                </div>
              ))}
            </div>
          </Reglage>
        )}
      </CarteReglage>
    </>
  )
}
