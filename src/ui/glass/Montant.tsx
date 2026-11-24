/**
 * Grand montant à la manière du tableau de bord de référence : le nombre en gras,
 * le symbole et l'unité plus pâles (« 985 € / pers. »). Pas de centimes : ce sont des estimations.
 */
export function Montant({ valeur, unite, className = '' }: { valeur: number; unite?: string; className?: string }) {
  const nombre = Math.round(valeur).toLocaleString('fr-FR')
  return (
    <span className={`tabular-nums ${className}`}>
      <span className="font-bold tracking-tight">{nombre}</span>
      <span className="font-semibold opacity-55"> €</span>
      {unite && <span className="text-[0.5em] font-medium opacity-60"> {unite}</span>}
    </span>
  )
}
