import type { ModeTransport } from '../data/types'
import type { OptionTransport } from '../engine/types'
import { formaterEuros } from '../lib/format'
import { MODES } from '../lib/libelles'
import { ChoixSegmente } from './ChoixSegmente'

interface Props {
  /** Coûts calculés (null tant qu'aucune destination n'est choisie) */
  options: OptionTransport[] | null
  /** Mode souhaité */
  mode: ModeTransport
  /** Mode réellement retenu par le calcul */
  retenu: ModeTransport | null
  onChange: (mode: ModeTransport) => void
}

export function ChoixTransport({ options, mode, retenu, onChange }: Props) {
  const raisonDuChangement = retenu && retenu !== mode ? options?.find((o) => o.mode === mode)?.raison : undefined

  return (
    <div>
      <ChoixSegmente
        legende="Transport (aller-retour pour le groupe)"
        valeur={retenu ?? mode}
        onChange={onChange}
        options={MODES.map((m) => {
          const option = options?.find((o) => o.mode === m.id)
          const indisponible = option ? !option.disponible : false
          return {
            valeur: m.id,
            libelle: (
              <>
                <span aria-hidden="true">{m.icone}</span> {m.libelle}
              </>
            ),
            detail: option ? (indisponible ? 'Impossible' : formaterEuros(option.cout)) : undefined,
            desactive: indisponible,
            titre: option?.raison,
          }
        })}
      />
      {raisonDuChangement && (
        <p className="mt-3 rounded-2xl bg-ocean-600/10 px-4 py-3 text-sm text-ocean-900 dark:bg-ocean-300/10 dark:text-ocean-100">
          <span aria-hidden="true">ℹ️ </span>
          {raisonDuChangement} Le calcul utilise le mode possible le moins cher.
        </p>
      )}
    </div>
  )
}
