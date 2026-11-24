import type { Lieu, LieuVisite, ModeTransport, Reglages } from '../domain/types'
import { ajouterJours } from './dates'
import { reglagesEffectifs } from './reglages'

export type CategorieLien = 'transport' | 'logement' | 'activites' | 'pratique'

export interface LienReservation {
  categorie: CategorieLien
  titre: string
  description: string
  url: string
  /** Vrai si les dates, lieux et voyageurs sont déjà remplis sur le site */
  preRempli: boolean
}

export interface ElementChecklist {
  id: string
  libelle: string
  categorie: CategorieLien
}

export interface EntreeLiens {
  depart: Lieu
  arrivee: Lieu
  reglages: Reglages
}

const PAYS_UE_SCHENGEN = new Set(
  'fr de be nl lu it es pt at gr ie fi se dk ee lv lt pl cz sk hu si hr ro bg mt cy is no ch li mc ad sm va'.split(' '),
)

/** Formalités d'entrée (pour un voyageur français) : indicatif, à vérifier sur diplomatie.gouv.fr. */
const FORMALITES: Record<string, string> = {
  us: 'Autorisation ESTA à demander en ligne avant le départ',
  ca: 'Autorisation de voyage électronique (AVE) à demander avant le départ',
  gb: 'Autorisation ETA à demander avant le départ',
  au: 'Visa électronique (ETA / eVisitor) à demander avant le départ',
  nz: 'Autorisation NZeTA à demander avant le départ',
  in: 'E-visa à demander avant le départ',
  lk: 'Autorisation ETA à demander avant le départ',
  kh: 'Visa (e-visa ou à l’arrivée)',
  eg: 'Visa (e-visa ou à l’arrivée)',
  ke: 'Autorisation eTA à demander avant le départ',
  tz: 'Visa (e-visa) à demander avant le départ',
}

const q = (v: string) => encodeURIComponent(v)
const ville = (l: Lieu) => (l.type && !['city', 'town', 'village', 'municipality'].includes(l.type) ? l.detail.split(',')[0] || l.nom : l.nom)

/**
 * Liens vers les sites de réservation, pré-remplis quand le site accepte des paramètres
 * publics dans l'adresse (dates, destination, voyageurs). Aucun lien d'affiliation.
 */
export function genererLiensReservation({ depart, arrivee, reglages }: EntreeLiens): LienReservation[] {
  const s = reglages.simple
  const av = reglagesEffectifs(reglages)
  const aller = s.dateDepart
  const retour = ajouterJours(s.dateDepart, s.nuits)
  const de = ville(depart)
  const a = ville(arrivee)
  const coord = (l: Lieu) => `${l.lat.toFixed(5)},${l.lon.toFixed(5)}`
  const liens: LienReservation[] = []

  const transport: Record<ModeTransport, () => LienReservation[]> = {
    avion: () => [
      {
        categorie: 'transport',
        titre: 'Comparer les vols (Google Vols)',
        description: `${de} → ${a}, aller le ${aller}, retour le ${retour}, ${s.adultes + s.enfants} voyageur(s)`,
        url: `https://www.google.com/travel/flights?hl=fr&q=${q(`Vols de ${de} à ${a} le ${aller} retour le ${retour} ${s.adultes} adultes${s.enfants ? ` ${s.enfants} enfants` : ''}`)}`,
        preRempli: true,
      },
      { categorie: 'transport', titre: 'Comparer sur Skyscanner', description: 'Saisissez les villes et les dates sur le site.', url: 'https://www.skyscanner.fr/', preRempli: false },
    ],
    train: () => [
      { categorie: 'transport', titre: 'Itinéraire en transports (Google Maps)', description: `${de} → ${a}`, url: `https://www.google.com/maps/dir/?api=1&origin=${coord(depart)}&destination=${coord(arrivee)}&travelmode=transit`, preRempli: true },
      { categorie: 'transport', titre: 'Billets de train (SNCF Connect)', description: 'Trains en France et vers l’Europe.', url: 'https://www.sncf-connect.com/', preRempli: false },
      { categorie: 'transport', titre: 'Billets de train (Trainline)', description: 'Compare les compagnies européennes.', url: 'https://www.thetrainline.com/fr', preRempli: false },
    ],
    car: () => [
      { categorie: 'transport', titre: 'Cars longue distance (BlaBlaCar Bus)', description: 'Saisissez les villes et la date sur le site.', url: 'https://www.blablacar.fr/bus', preRempli: false },
      { categorie: 'transport', titre: 'Cars longue distance (FlixBus)', description: 'Saisissez les villes et la date sur le site.', url: 'https://www.flixbus.fr/', preRempli: false },
    ],
    voiture: () => [
      { categorie: 'transport', titre: 'Itinéraire en voiture (Google Maps)', description: `${de} → ${a}${av.peages ? '' : ', sans péages à régler dans Maps'}`, url: `https://www.google.com/maps/dir/?api=1&origin=${coord(depart)}&destination=${coord(arrivee)}&travelmode=driving`, preRempli: true },
      {
        categorie: 'transport',
        titre: 'Covoiturage (BlaBlaCar)',
        description: `Places libres pour ${de} → ${a} le ${aller}`,
        url: `https://www.blablacar.fr/search?fn=${q(de)}&tn=${q(a)}&db=${aller}&seats=${Math.min(4, s.adultes + s.enfants)}`,
        preRempli: true,
      },
    ],
  }
  liens.push(...transport[s.transport]())

  // Logement
  const chambres = av.typeLogement === 'hotel' ? av.chambres : 1
  liens.push({
    categorie: 'logement',
    titre: av.typeLogement === 'hotel' ? `Hôtels ${av.etoiles} étoiles (Booking.com)` : 'Hébergements (Booking.com)',
    description: `${a}, du ${aller} au ${retour}, ${s.adultes} adulte(s)${s.enfants ? `, ${s.enfants} enfant(s)` : ''}`,
    url:
      `https://www.booking.com/searchresults.fr.html?ss=${q(a)}&checkin=${aller}&checkout=${retour}&group_adults=${s.adultes}&group_children=${s.enfants}&no_rooms=${chambres}` +
      (s.enfants ? Array.from({ length: s.enfants }, () => '&age=8').join('') : '') +
      (av.typeLogement === 'hotel' ? `&nflt=${q(`class=${av.etoiles}`)}` : ''),
    preRempli: true,
  })
  if (av.typeLogement === 'appartement' || s.adultes + s.enfants >= 3) {
    liens.push({
      categorie: 'logement',
      titre: 'Appartements (Airbnb)',
      description: `${a}, du ${aller} au ${retour}`,
      url: `https://www.airbnb.fr/s/${q(a)}/homes?checkin=${aller}&checkout=${retour}&adults=${s.adultes}&children=${s.enfants}`,
      preRempli: true,
    })
  }
  if (av.typeLogement === 'auberge') liens.push({ categorie: 'logement', titre: 'Auberges de jeunesse (Hostelworld)', description: `Cherchez « ${a} » sur le site.`, url: 'https://www.hostelworld.com/fr/', preRempli: false })

  // Activités
  liens.push(
    { categorie: 'activites', titre: 'Visites et billets (GetYourGuide)', description: `Activités à ${a} pendant votre séjour`, url: `https://www.getyourguide.fr/s/?q=${q(a)}&date_from=${aller}&date_to=${retour}`, preRempli: true },
    { categorie: 'activites', titre: 'Que faire sur place (Google Maps)', description: 'Lieux, horaires et avis', url: `https://www.google.com/maps/search/?api=1&query=${q(`Que faire à ${a}`)}`, preRempli: true },
  )

  // Pratique
  if (arrivee.pays && !PAYS_UE_SCHENGEN.has(arrivee.pays)) {
    liens.push({ categorie: 'pratique', titre: 'Conseils aux voyageurs (diplomatie.gouv.fr)', description: 'Formalités d’entrée, santé et sécurité du pays', url: 'https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/', preRempli: false })
  }
  return liens
}

/** Liens « Réserver » et « Infos » d'une activité de l'itinéraire. */
export function liensActivite(lieu: LieuVisite, villeDestination: string): { infos: string; reserver: string | null } {
  const ref = lieu.wikipedia?.match(/^(fr|en):(.+)$/)
  const infos = ref
    ? `https://${ref[1]}.wikipedia.org/wiki/${q(ref[2].replaceAll(' ', '_'))}`
    : lieu.source === 'osm' && /^osm-(node|way|relation)-\d+$/.test(lieu.id)
      ? `https://www.openstreetmap.org/${lieu.id.split('-')[1]}/${lieu.id.split('-')[2]}`
      : `https://www.google.com/maps/search/?api=1&query=${q(`${lieu.nom} ${villeDestination}`)}`
  const payant = !lieu.gratuit && !['parc', 'point_de_vue', 'marche', 'plage', 'nature'].includes(lieu.type)
  return { infos, reserver: payant ? (lieu.site ?? `https://www.getyourguide.fr/s/?q=${q(`${lieu.nom} ${villeDestination}`)}`) : null }
}

/** Liste de choses à faire avant le départ. */
export function checklistVoyage({ arrivee, reglages }: Pick<EntreeLiens, 'arrivee' | 'reglages'>): ElementChecklist[] {
  const s = reglages.simple
  const av = reglagesEffectifs(reglages)
  const pays = arrivee.pays
  const horsSchengen = !!pays && !PAYS_UE_SCHENGEN.has(pays)
  const items: ElementChecklist[] = [
    { id: 'transport', categorie: 'transport', libelle: s.transport === 'voiture' ? 'Vérifier la voiture (pneus, niveaux) et préparer l’itinéraire' : `Réserver les billets de ${s.transport === 'car' ? 'car' : s.transport}` },
    { id: 'logement', categorie: 'logement', libelle: `Réserver le logement (${s.nuits} nuit${s.nuits > 1 ? 's' : ''})` },
    { id: 'papiers', categorie: 'pratique', libelle: horsSchengen ? 'Vérifier la validité des passeports' : 'Prendre une carte d’identité ou un passeport valide' },
  ]
  if (pays && FORMALITES[pays]) items.push({ id: 'formalites', categorie: 'pratique', libelle: FORMALITES[pays] })
  if (pays && PAYS_UE_SCHENGEN.has(pays) && pays !== 'fr') items.push({ id: 'cesam', categorie: 'pratique', libelle: 'Demander la carte européenne d’assurance maladie' })
  if (av.assurance) items.push({ id: 'assurance', categorie: 'pratique', libelle: 'Souscrire une assurance voyage (ou vérifier celle de votre carte bancaire)' })
  if (s.transport === 'avion') items.push({ id: 'enregistrement', categorie: 'transport', libelle: 'S’enregistrer en ligne 24 à 48 h avant le vol' })
  items.push({ id: 'activites', categorie: 'activites', libelle: 'Réserver les visites les plus demandées' })
  if (horsSchengen) items.push({ id: 'banque', categorie: 'pratique', libelle: 'Prévenir sa banque et vérifier les frais de paiement à l’étranger' })
  return items
}
