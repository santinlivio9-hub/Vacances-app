import { lirePreferences, preferencesParDefaut, usePreferences } from '../store/preferences'
import { useFavoris } from '../store/favoris'
import { useVoyage } from '../store/voyage'

/** Toutes les données de l'utilisateur, telles qu'elles sont sur cet appareil. */
export function donneesLocales() {
  return {
    application: 'Valise & Cap',
    exporteLe: new Date().toISOString(),
    preferences: lirePreferences(),
    voyages: useVoyage.getState().sauvegardes,
    favoris: useFavoris.getState().favoris,
  }
}

/** Télécharge un fichier JSON avec les voyages, favoris et préférences. */
export function exporterDonnees() {
  const blob = new Blob([JSON.stringify(donneesLocales(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `valise-et-cap-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Efface les voyages, favoris et préférences de cet appareil. */
export function effacerDonneesLocales() {
  useVoyage.getState().remplacerSauvegardes([])
  useFavoris.getState().remplacer([])
  usePreferences.getState().remplacer(preferencesParDefaut())
}
