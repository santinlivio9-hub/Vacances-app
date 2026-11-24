import type { StateStorage } from 'zustand/middleware'

/**
 * localStorage protégé : en navigation privée, stockage plein ou bloqué,
 * l'app continue de fonctionner (l'état reste simplement en mémoire).
 */
export const stockageSur: StateStorage = {
  getItem(cle) {
    try {
      return localStorage.getItem(cle)
    } catch {
      return null
    }
  },
  setItem(cle, valeur) {
    try {
      localStorage.setItem(cle, valeur)
    } catch {
      /* ignoré */
    }
  },
  removeItem(cle) {
    try {
      localStorage.removeItem(cle)
    } catch {
      /* ignoré */
    }
  },
}
