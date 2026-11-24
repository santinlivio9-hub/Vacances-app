import { Loader2, MapPin, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { Coordonnees, Lieu } from '../domain/types'
import { rechercherLieux, type ResultatRecherche } from '../services/recherche'
import { useDebounce } from './hooks'

interface Props {
  libelle: string
  placeholder: string
  valeur: Lieu | null
  onChoisir: (lieu: Lieu | null) => void
  proximite?: Coordonnees
  /** Pastille de couleur (A / B) */
  pastille: ReactNode
  /** Bouton supplémentaire dans le champ (ex. « Ma position ») */
  action?: ReactNode
  autoFocus?: boolean
}

/**
 * Champ d'adresse avec autocomplétion (combobox accessible) :
 * saisie débouncée à 300 ms, flèches haut/bas, Entrée, Échap.
 * Entrée sans suggestion lance une recherche « validée » (Nominatim autorisé en secours).
 */
export function ChampLieu({ libelle, placeholder, valeur, onChoisir, proximite, pastille, action, autoFocus }: Props) {
  const id = useId()
  const [texte, setTexte] = useState(valeur?.nom ?? '')
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(-1)
  const [resultat, setResultat] = useState<ResultatRecherche | null>(null)
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const saisieRetardee = useDebounce(texte, 300)
  const refChamp = useRef<HTMLInputElement>(null)
  const modifieParUtilisateur = useRef(false)

  // La valeur change depuis la carte (clic, glisser, inverser) : on met le texte à jour.
  useEffect(() => {
    modifieParUtilisateur.current = false
    setTexte(valeur?.nom ?? '')
    setOuvert(false)
  }, [valeur])

  useEffect(() => {
    if (!modifieParUtilisateur.current || saisieRetardee.trim().length < 2) {
      setResultat(null)
      return
    }
    const controle = new AbortController()
    setChargement(true)
    rechercherLieux(saisieRetardee, { proximite, signal: controle.signal })
      .then((r) => {
        setResultat(r)
        setActif(r.lieux.length > 0 ? 0 : -1)
        setOuvert(true)
      })
      .catch(() => {})
      .finally(() => !controle.signal.aborted && setChargement(false))
    return () => controle.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saisieRetardee])

  const lieux = resultat?.lieux ?? []

  function choisir(lieu: Lieu) {
    onChoisir(lieu)
    setTexte(lieu.nom)
    setOuvert(false)
    setMessage(null)
    modifieParUtilisateur.current = false
  }

  async function valider() {
    if (ouvert && lieux[actif]) return choisir(lieux[actif])
    if (texte.trim().length < 2) return
    setChargement(true)
    try {
      const r = await rechercherLieux(texte, { proximite, valide: true })
      if (r.lieux[0]) choisir(r.lieux[0])
      else setMessage(`Aucun lieu trouvé pour « ${texte.trim()} ». Essayez un autre nom ou touchez la carte.`)
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {libelle}
      </label>
      <div className="flex h-12 items-center gap-2 rounded-2xl bg-white/80 pr-1 pl-3 ring-1 ring-slate-900/10 focus-within:ring-2 focus-within:ring-ocean-500 dark:bg-slate-900/60 dark:ring-white/10">
        {pastille}
        <input
          ref={refChamp}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={ouvert && lieux.length > 0}
          aria-controls={`${id}-liste`}
          aria-autocomplete="list"
          aria-activedescendant={ouvert && actif >= 0 ? `${id}-${actif}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          enterKeyHint="search"
          placeholder={placeholder}
          value={texte}
          onChange={(e) => {
            modifieParUtilisateur.current = true
            setTexte(e.target.value)
            setMessage(null)
          }}
          onFocus={(e) => {
            e.target.select()
            if (lieux.length > 0) setOuvert(true)
          }}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOuvert(true)
              setActif((a) => Math.min(lieux.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActif((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              void valider()
            } else if (e.key === 'Escape') {
              setOuvert(false)
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400"
        />
        {chargement && <Loader2 className="size-4 shrink-0 animate-spin text-slate-400" aria-label="Recherche en cours" />}
        {texte && !chargement && (
          <button
            type="button"
            onClick={() => {
              setTexte('')
              onChoisir(null)
              setResultat(null)
              refChamp.current?.focus()
            }}
            className="grid size-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10"
            aria-label={`Effacer ${libelle.toLowerCase()}`}
          >
            <X className="size-4" />
          </button>
        )}
        {action}
      </div>

      {ouvert && resultat && (
        <div className="verre absolute inset-x-0 top-full z-[1000] mt-2 overflow-hidden rounded-2xl [--verre-fond:0.97]">
          {lieux.length > 0 ? (
            <ul id={`${id}-liste`} role="listbox" aria-label={`Suggestions pour ${libelle.toLowerCase()}`}>
              {lieux.map((lieu, i) => (
                <li
                  key={`${lieu.lat},${lieu.lon},${i}`}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={i === actif}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choisir(lieu)}
                  onMouseEnter={() => setActif(i)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${i === actif ? 'bg-ocean-100/80 dark:bg-ocean-800/60' : ''}`}
                >
                  <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{lieu.nom}</span>
                    {lieu.detail && <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{lieu.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Aucune suggestion. Appuyez sur Entrée pour une recherche plus large.</p>
          )}
          {resultat.source === 'communes' && (
            <p className="border-t border-slate-900/5 px-4 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              Recherche en ligne indisponible : seules les communes françaises sont proposées.
            </p>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-2 rounded-xl bg-white/90 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
          {message}
        </p>
      )}
    </div>
  )
}
