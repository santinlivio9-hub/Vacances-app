const FORMAT_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Lit une date AAAA-MM-JJ (en UTC, pour éviter les décalages de fuseau). */
export function lireDate(iso: string): Date {
  const date = new Date(`${iso}T00:00:00Z`)
  if (!FORMAT_ISO.test(iso) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    throw new RangeError(`Date invalide : « ${iso} » (format attendu AAAA-MM-JJ)`)
  }
  return date
}

export function ajouterJours(iso: string, jours: number): string {
  const date = lireDate(iso)
  date.setUTCDate(date.getUTCDate() + jours)
  return date.toISOString().slice(0, 10)
}

/** Mois de 1 à 12 */
export function moisDe(iso: string): number {
  return lireDate(iso).getUTCMonth() + 1
}
