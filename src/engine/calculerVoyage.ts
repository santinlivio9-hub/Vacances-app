import type { Destination } from '../data/types'
import { CONTEXTE_PAR_DEFAUT, type ContexteCalcul } from './contexte'
import { saisonDuVoyage } from './saison'
import { choisirTransport, NOMS_MODES, optionsTransport } from './transport'
import type { ParametresVoyage, Postes, ResultatVoyage } from './types'

export const TAUX_IMPREVUS_PAR_DEFAUT = 0.1

/** Une chambre double pour deux voyageurs. */
export const chambresNecessaires = (personnes: number) => Math.ceil(personnes / 2)

const somme = (valeurs: number[]) => valeurs.reduce((total, v) => total + v, 0)

function verifierEntier(valeur: number, nom: string, minimum: number) {
  if (!Number.isInteger(valeur) || valeur < minimum) {
    throw new RangeError(`${nom} doit être un nombre entier supérieur ou égal à ${minimum} (reçu : ${valeur})`)
  }
}

function verifierParametres(params: ParametresVoyage) {
  verifierEntier(params.personnes, 'Le nombre de voyageurs', 1)
  verifierEntier(params.nuits, 'Le nombre de nuits', 1)
  if (params.chambres !== undefined) verifierEntier(params.chambres, 'Le nombre de chambres', 1)
  const taux = params.tauxImprevus
  if (taux !== undefined && !(taux >= 0 && taux <= 1)) {
    throw new RangeError(`La part d'imprévus doit être comprise entre 0 et 1 (reçu : ${taux})`)
  }
}

/** Total des activités suggérées cochées, pour une personne (les indices inconnus sont ignorés). */
export function prixActivitesChoisies(destination: Destination, indices: number[] = []): number {
  const uniques = new Set(indices)
  return somme(destination.activitesSuggerees.filter((_, i) => uniques.has(i)).map((a) => a.prixIndicatif))
}

/**
 * Coût complet d'un voyage, poste par poste.
 * Les dépenses quotidiennes sont comptées sur un jour par nuit : les jours d'arrivée et de départ
 * sont en partie pris par le trajet.
 */
export function calculerVoyage(params: ParametresVoyage, contexte: ContexteCalcul = CONTEXTE_PAR_DEFAUT): ResultatVoyage {
  verifierParametres(params)
  const { destination, personnes, nuits, confort } = params
  const saison = saisonDuVoyage(destination, params.dateDepart, params.saison)
  const chambres = params.chambres ?? chambresNecessaires(personnes)
  const jours = nuits
  const avertissements: string[] = []

  const options = optionsTransport(params.depart, destination, personnes, saison, contexte)
  const transport = choisirTransport(options, params.mode)
  if (!transport) {
    avertissements.push(`Aucun moyen de transport n'est proposé pour ${destination.nom} depuis ${params.depart.nom}.`)
  } else if (transport.mode !== params.mode) {
    const demande = options.find((o) => o.mode === params.mode)
    avertissements.push(`${demande?.raison ?? ''} Calcul fait en ${NOMS_MODES[transport.mode]}.`.trim())
  }

  const horsImprevus = {
    transport: Math.round(transport?.cout ?? 0),
    logement: Math.round(chambres * nuits * destination.logement[confort] * destination.saison[saison]),
    repas: Math.round(personnes * jours * destination.repas[confort]),
    activites: Math.round(
      personnes * (jours * destination.activites[confort] + prixActivitesChoisies(destination, params.activitesChoisies)),
    ),
    transportLocal: Math.round(personnes * jours * destination.transportLocal),
  }
  const taux = params.tauxImprevus ?? TAUX_IMPREVUS_PAR_DEFAUT
  const postes: Postes = { ...horsImprevus, imprevus: Math.round(somme(Object.values(horsImprevus)) * taux) }
  const total = somme(Object.values(postes))

  return {
    total,
    parPersonne: Math.round(total / personnes),
    postes,
    saison,
    jours,
    chambres,
    transport,
    avertissements,
  }
}
