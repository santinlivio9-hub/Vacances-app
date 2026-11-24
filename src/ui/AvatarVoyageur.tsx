/** Couleurs des voyageurs (avatars, donut, barres) : contrastées avec du texte blanc, distinctes entre elles. */
export const COULEURS_VOYAGEURS = ['#2f6fe0', '#e4572e', '#1f9d5a', '#9b51e0', '#d4880f', '#0e9aa7', '#d6336c', '#5c6ac4', '#7a8a00', '#a0522d']

export const couleurVoyageur = (index: number) => COULEURS_VOYAGEURS[index % COULEURS_VOYAGEURS.length]

export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean)
  // « Adulte 1 » → « A1 », « Léa Martin » → « LM », « Tom » → « TO »
  if (mots.length >= 2) return (mots[0][0] + mots[1][0]).toUpperCase()
  return (mots[0] ?? '?').slice(0, 2).toUpperCase()
}

/** Avatar rond à initiales, couleur propre à chaque voyageur. */
export function AvatarVoyageur({ nom, index, taille = 36, className = '' }: { nom: string; index: number; taille?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_4px_10px_-4px_rgb(0_0_0/0.4)] ring-2 ring-white/70 dark:ring-white/25 ${className}`}
      style={{ width: taille, height: taille, fontSize: taille * 0.36, background: `linear-gradient(150deg, ${couleurVoyageur(index)}, color-mix(in srgb, ${couleurVoyageur(index)} 70%, black))` }}
    >
      {initiales(nom)}
    </span>
  )
}
