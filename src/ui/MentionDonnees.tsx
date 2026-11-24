/** Mention discrète obligatoire : estimation + attribution des données ouvertes. */
export function MentionDonnees({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      Prix estimés à titre indicatif. Données ©{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        OpenStreetMap
      </a>
      , Wikipédia.
    </p>
  )
}
