/** Classes partagées des boutons et liens-boutons (cibles tactiles ≥ 44 px). */
const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50'

export const boutonPrincipal = `${base} bg-ocean-600 text-white shadow-md shadow-ocean-600/25 hover:bg-ocean-700 dark:bg-ocean-500 dark:hover:bg-ocean-400 dark:text-ocean-950`

export const boutonSecondaire = `${base} verre text-ocean-800 hover:bg-white/80 dark:text-ocean-100 dark:hover:bg-white/10`

export const boutonDiscret = `${base} text-ocean-700 hover:bg-ocean-600/10 dark:text-ocean-200 dark:hover:bg-white/10`

export const texteSecondaire = 'text-slate-600 dark:text-slate-300'
