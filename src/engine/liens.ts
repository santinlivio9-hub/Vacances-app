import type { Destination, LieuDepart, ModeTransport } from '../data/types'
import { chambresNecessaires } from './calculerVoyage'
import { CONTEXTE_PAR_DEFAUT, type ContexteCalcul } from './contexte'
import { ajouterJours, lireDate } from './dates'
import { aeroportLePlusProche } from './geo'

export type PosteReservation = 'logement' | 'transport' | 'activites'

export interface LienReservation {
  poste: PosteReservation
  site: string
  url: string
  /** Vrai si les dates et les voyageurs sont transmis dans le lien */
  prerempli: boolean
}

export interface ParametresLiens {
  depart: LieuDepart
  personnes: number
  nuits: number
  /** Mode de transport retenu */
  mode: ModeTransport
  dateDepart?: string
  chambres?: number
}

/** Codes de ville IATA remplacés par l'aéroport principal, plus sûrs dans les liens Skyscanner. */
const AEROPORT_PRINCIPAL: Record<string, string> = { PAR: 'CDG', NYC: 'JFK', ROM: 'FCO' }

const codeAeroport = (code: string) => (AEROPORT_PRINCIPAL[code] ?? code).toLowerCase()

/** 2027-06-01 → 270601 (format des dates Skyscanner) */
const dateSkyscanner = (iso: string) => iso.slice(2).replaceAll('-', '')

const lieuTexte = (destination: Destination) => `${destination.nom}, ${destination.pays}`

function avecParametres(base: string, parametres: Record<string, string | number | undefined>): string {
  const url = new URL(base)
  for (const [cle, valeur] of Object.entries(parametres)) {
    if (valeur !== undefined) url.searchParams.set(cle, String(valeur))
  }
  return url.toString()
}

function liensLogement(destination: Destination, p: ParametresLiens, arrivee?: string, retour?: string): LienReservation[] {
  const prerempli = arrivee !== undefined
  const slugAirbnb = [destination.nom, destination.pays].map((s) => encodeURIComponent(s.replaceAll(' ', '-'))).join('--')
  return [
    {
      poste: 'logement',
      site: 'Booking.com',
      prerempli,
      url: avecParametres('https://www.booking.com/searchresults.fr.html', {
        ss: lieuTexte(destination),
        checkin: arrivee,
        checkout: retour,
        group_adults: p.personnes,
        group_children: 0,
        no_rooms: p.chambres ?? chambresNecessaires(p.personnes),
        selected_currency: 'EUR',
      }),
    },
    {
      poste: 'logement',
      site: 'Airbnb',
      prerempli,
      url: avecParametres(`https://www.airbnb.fr/s/${slugAirbnb}/homes`, { checkin: arrivee, checkout: retour, adults: p.personnes }),
    },
  ]
}

function liensTransport(
  destination: Destination,
  p: ParametresLiens,
  contexte: ContexteCalcul,
  arrivee?: string,
  retour?: string,
): LienReservation[] {
  if (p.mode === 'avion') {
    const origine = codeAeroport(aeroportLePlusProche(p.depart, contexte.aeroports).aeroport.code)
    const arriveeCode = codeAeroport(destination.aeroport)
    const dates = arrivee && retour ? `${dateSkyscanner(arrivee)}/${dateSkyscanner(retour)}/` : ''
    return [
      {
        poste: 'transport',
        site: 'Skyscanner',
        prerempli: dates !== '',
        url: avecParametres(`https://www.skyscanner.fr/transport/vols/${origine}/${arriveeCode}/${dates}`, {
          adultsv2: p.personnes,
          cabinclass: 'economy',
          rtn: 1,
        }),
      },
      // Le pré-remplissage de Google Flights par URL n'est pas fiable : simple lien de recherche.
      { poste: 'transport', site: 'Google Flights', prerempli: false, url: 'https://www.google.com/travel/flights?hl=fr&curr=EUR' },
    ]
  }

  if (p.mode === 'train') {
    // SNCF Connect et Trainline n'acceptent pas de recherche pré-remplie stable par URL.
    return [
      { poste: 'transport', site: 'SNCF Connect', prerempli: false, url: 'https://www.sncf-connect.com/' },
      { poste: 'transport', site: 'Trainline', prerempli: false, url: 'https://www.thetrainline.com/fr' },
    ]
  }

  return [
    {
      poste: 'transport',
      site: 'Google Maps (itinéraire)',
      prerempli: true,
      url: avecParametres('https://www.google.com/maps/dir/', {
        api: 1,
        origin: `${p.depart.nom} ${p.depart.codePostal}`,
        destination: lieuTexte(destination),
        travelmode: 'driving',
      }),
    },
  ]
}

/**
 * Liens vers les sites de réservation, pré-remplis quand le format d'URL du site le permet de façon fiable.
 * Sans date de départ, les liens ouvrent une simple recherche.
 */
export function genererLiensReservation(
  destination: Destination,
  params: ParametresLiens,
  contexte: ContexteCalcul = CONTEXTE_PAR_DEFAUT,
): LienReservation[] {
  if (params.dateDepart) lireDate(params.dateDepart) // valide le format
  const arrivee = params.dateDepart
  const retour = arrivee ? ajouterJours(arrivee, params.nuits) : undefined

  return [
    ...liensTransport(destination, params, contexte, arrivee, retour),
    ...liensLogement(destination, params, arrivee, retour),
    {
      poste: 'activites',
      site: 'GetYourGuide',
      prerempli: false,
      url: avecParametres('https://www.getyourguide.fr/s/', { q: destination.nom }),
    },
  ]
}
