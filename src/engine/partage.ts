import type { Lieu, Reglages } from '../domain/types'

/** Ce que contient une adresse de partage : de quoi recalculer exactement le même voyage. */
export interface VoyagePartage {
  depart: Lieu
  arrivee: Lieu
  reglages: Reglages
  graine: number
}

const versBase64Url = (texte: string) => {
  const octets = new TextEncoder().encode(texte)
  let binaire = ''
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
const depuisBase64Url = (code: string) => {
  const binaire = atob(code.replaceAll('-', '+').replaceAll('_', '/'))
  return new TextDecoder().decode(Uint8Array.from(binaire, (c) => c.charCodeAt(0)))
}

const allege = (l: Lieu): Lieu => ({
  nom: l.nom,
  detail: l.detail,
  lat: Math.round(l.lat * 1e5) / 1e5,
  lon: Math.round(l.lon * 1e5) / 1e5,
  ...(l.pays ? { pays: l.pays } : {}),
  ...(l.codePostal ? { codePostal: l.codePostal } : {}),
  ...(l.type ? { type: l.type } : {}),
})

export function encoderVoyage(v: VoyagePartage): string {
  return versBase64Url(JSON.stringify({ v: 1, d: allege(v.depart), a: allege(v.arrivee), s: v.reglages.simple, m: v.reglages.modifies, g: v.graine }))
}

const estLieu = (l: unknown): l is Lieu =>
  !!l && typeof l === 'object' && typeof (l as Lieu).nom === 'string' && Number.isFinite((l as Lieu).lat) && Number.isFinite((l as Lieu).lon) && Math.abs((l as Lieu).lat) <= 90

/** Décode une adresse de partage ; null si elle est abîmée ou invalide. */
export function decoderVoyage(code: string): VoyagePartage | null {
  try {
    const o = JSON.parse(depuisBase64Url(code))
    if (o?.v !== 1 || !estLieu(o.d) || !estLieu(o.a) || typeof o.s !== 'object' || !o.s) return null
    const s = o.s
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.dateDepart) || !(s.nuits >= 1 && s.nuits <= 60) || !(s.adultes >= 1 && s.adultes <= 12) || !(s.enfants >= 0 && s.enfants <= 10)) return null
    if (!['voiture', 'train', 'avion', 'car', 'covoiturage'].includes(s.transport) || !['eco', 'equilibre', 'confort'].includes(s.style) || !Array.isArray(s.interets)) return null
    return {
      depart: o.d,
      arrivee: o.a,
      reglages: { simple: s, modifies: o.m && typeof o.m === 'object' ? o.m : {} },
      graine: Number.isInteger(o.g) ? o.g : 1,
    }
  } catch {
    return null
  }
}
