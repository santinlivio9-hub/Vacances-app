const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const nombres = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const dateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const dateCourte = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export const formaterEuros = (montant: number) => euros.format(Math.round(montant))
export const formaterNombre = (n: number) => nombres.format(n)
export const formaterKm = (km: number) => `${nombres.format(Math.round(km / 10) * 10)} km`
export const formaterPourcent = (part: number) => `${Math.round(part * 100)} %`

/** « 2027-06-12 » → « sam. 12 juin 2027 » */
export const formaterDate = (iso: string) => dateLongue.format(new Date(`${iso}T00:00:00Z`))
/** « 2027-06-12 » → « 12 juin » */
export const formaterDateCourte = (iso: string) => dateCourte.format(new Date(`${iso}T00:00:00Z`))

/** 1 → « 1 voyageur », 3 → « 3 voyageurs » */
export const pluriel = (n: number, singulier: string, plurielForme = `${singulier}s`) =>
  `${formaterNombre(n)} ${n > 1 ? plurielForme : singulier}`

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** [6, 7, 8] → « juin, juil., août » */
export const formaterMois = (mois: number[]) =>
  [...mois]
    .sort((a, b) => a - b)
    .map((m) => MOIS_COURTS[m - 1])
    .join(', ')
