import type { ResultatVoyage } from '../engine/types'
import { formaterEuros, formaterKm, formaterPourcent, pluriel } from '../lib/format'
import { libelleMode, POSTES, SAISONS } from '../lib/libelles'

interface Props {
  resultat: ResultatVoyage
  personnes: number
  nuits: number
  tauxImprevus: number
  nombreActivites: number
}

function detailTransport(resultat: ResultatVoyage): string {
  const t = resultat.transport
  if (!t) return 'Aucun transport possible'
  const mode = libelleMode(t.mode).libelle
  if (t.mode === 'voiture') return `${mode} · ${pluriel(t.vehicules ?? 1, 'véhicule')} · ${formaterKm(t.distanceKm * 2)} aller-retour`
  const parPersonne = `${formaterEuros(t.prixParPersonne ?? 0)} A/R par pers.`
  if (t.mode === 'train') return `${mode} · ${parPersonne}`
  const acces = t.accesAeroportKm ? ', trajet jusqu’à l’aéroport compris' : ''
  return `${mode} depuis ${t.aeroportDepart?.nom ?? 'l’aéroport le plus proche'} · ${parPersonne}${acces}`
}

/** Détail ligne par ligne : pastille de couleur, poste, explication et montant. */
export function DetailPostes({ resultat, personnes, nuits, tauxImprevus, nombreActivites }: Props) {
  const voyageurs = pluriel(personnes, 'pers.', 'pers.')
  const jours = pluriel(resultat.jours, 'jour')
  const saison = SAISONS.find((s) => s.id === resultat.saison)!.libelle.toLowerCase()
  const details: Record<string, string> = {
    transport: detailTransport(resultat),
    logement: `${pluriel(resultat.chambres, 'chambre')} × ${pluriel(nuits, 'nuit')} · ${saison} saison`,
    repas: `${voyageurs} × ${jours}`,
    activites: `${voyageurs} × ${jours}${nombreActivites > 0 ? ` + ${pluriel(nombreActivites, 'activité choisie', 'activités choisies')}` : ''}`,
    transportLocal: `Transports en commun, taxis · ${voyageurs} × ${jours}`,
    imprevus: `${formaterPourcent(tauxImprevus)} du reste`,
  }

  return (
    <ul className="divide-y divide-slate-900/10 dark:divide-white/10">
      {POSTES.map((p) => (
        <li key={p.id} className="flex items-start gap-3 py-2.5">
          <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.couleur }} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{p.libelle}</span>
            <span className="block text-xs text-slate-600 dark:text-slate-300">{details[p.id]}</span>
          </span>
          <span className="text-sm font-semibold tabular-nums">{formaterEuros(resultat.postes[p.id])}</span>
        </li>
      ))}
    </ul>
  )
}
