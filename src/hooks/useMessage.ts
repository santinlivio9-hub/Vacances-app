import { useCallback, useEffect, useRef, useState } from 'react'

/** Petit message temporaire (« Simulation sauvegardée », « Lien copié »…). */
export function useMessage(dureeMs = 3500) {
  const [message, setMessage] = useState<string | null>(null)
  const minuteur = useRef<number | undefined>(undefined)

  const afficher = useCallback(
    (texte: string) => {
      window.clearTimeout(minuteur.current)
      setMessage(texte)
      minuteur.current = window.setTimeout(() => setMessage(null), dureeMs)
    },
    [dureeMs],
  )

  useEffect(() => () => window.clearTimeout(minuteur.current), [])

  return { message, afficher }
}
