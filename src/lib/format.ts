const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const nombres = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

export const formaterEuros = (montant: number) => euros.format(Math.round(montant))
export const formaterNombre = (n: number) => nombres.format(n)
export const formaterKm = (km: number) => `${nombres.format(Math.round(km / 10) * 10)} km`

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** [6, 7, 8] → « juin, juil., août » */
export const formaterMois = (mois: number[]) =>
  [...mois]
    .sort((a, b) => a - b)
    .map((m) => MOIS_COURTS[m - 1])
    .join(', ')
