import { formaterEuros } from '../lib/format'

interface Props {
  utilise: number
  budget: number
  couleur: string
  libelle: string
  epaisse?: boolean
}

/** Jauge « budget utilisé / budget total ». Au-delà de 100 %, elle reste pleine. */
export function Jauge({ utilise, budget, couleur, libelle, epaisse = false }: Props) {
  const part = Math.min(1, utilise / budget)
  return (
    <div
      role="meter"
      aria-label={libelle}
      aria-valuemin={0}
      aria-valuemax={budget}
      aria-valuenow={Math.min(utilise, budget)}
      aria-valuetext={`${formaterEuros(utilise)} sur ${formaterEuros(budget)}`}
      className={`w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10 ${epaisse ? 'h-4' : 'h-2'}`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${part * 100}%`, backgroundColor: couleur }}
      />
    </div>
  )
}
