import { useEffect, useId, useState } from 'react'
import { villesDepart } from '../data'
import { chargerCommunes } from '../data/communes'
import type { LieuDepart } from '../data/types'
import { rechercherCommunes, type Commune } from '../engine/communes'

interface Props {
  valeur: LieuDepart
  onChange: (lieu: LieuDepart) => void
}

type Etat = 'attente' | 'chargement' | 'pret' | 'erreur'

const versLieu = (c: Commune): LieuDepart => ({ nom: c.nom, codePostal: c.codesPostaux[0], lat: c.lat, lon: c.lon })

/** Choix de la ville de départ : accès rapide aux grandes villes + recherche parmi toutes les communes. */
export function RechercheVille({ valeur, onChange }: Props) {
  const idListe = useId()
  const [texte, setTexte] = useState('')
  const [etat, setEtat] = useState<Etat>('attente')
  const [communes, setCommunes] = useState<Commune[]>([])
  const [actif, setActif] = useState(0)

  const resultats = texte.trim() ? rechercherCommunes(communes, texte) : []
  const ouvert = resultats.length > 0

  useEffect(() => setActif(0), [texte])

  function preparer() {
    if (etat !== 'attente') return
    setEtat('chargement')
    chargerCommunes()
      .then((liste) => {
        setCommunes(liste)
        setEtat('pret')
      })
      .catch(() => setEtat('erreur'))
  }

  function choisir(lieu: LieuDepart) {
    onChange(lieu)
    setTexte('')
  }

  function gererTouche(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!ouvert) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActif((i) => (i + 1) % resultats.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActif((i) => (i - 1 + resultats.length) % resultats.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choisir(versLieu(resultats[actif]))
    } else if (e.key === 'Escape') {
      setTexte('')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {villesDepart.map((ville) => {
          const choisie = ville.nom === valeur.nom && ville.codePostal.slice(0, 2) === valeur.codePostal.slice(0, 2)
          return (
            <button
              key={ville.id}
              type="button"
              aria-pressed={choisie}
              onClick={() => choisir(ville)}
              className={`min-h-11 rounded-full px-4 text-sm font-medium transition ${
                choisie
                  ? 'bg-ocean-600 text-white shadow-md shadow-ocean-600/30'
                  : 'verre text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {ville.nom}
            </button>
          )
        })}
      </div>

      <div className="relative">
        <label htmlFor={`${idListe}-champ`} className="sr-only">
          Rechercher une autre ville de départ
        </label>
        <input
          id={`${idListe}-champ`}
          type="search"
          role="combobox"
          aria-expanded={ouvert}
          aria-controls={idListe}
          aria-autocomplete="list"
          aria-activedescendant={ouvert ? `${idListe}-${actif}` : undefined}
          autoComplete="off"
          placeholder="Autre ville ou code postal…"
          value={texte}
          onFocus={preparer}
          onChange={(e) => {
            preparer()
            setTexte(e.target.value)
          }}
          onKeyDown={gererTouche}
          className="verre h-12 w-full rounded-2xl px-4 text-base placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 dark:placeholder:text-slate-400"
        />

        {texte.trim() && etat === 'chargement' && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Chargement des communes…</p>}
        {etat === 'erreur' && (
          <p role="alert" className="mt-2 text-sm text-corail-700 dark:text-corail-300">
            Impossible de charger la liste des communes. Vérifiez votre connexion et réessayez.
          </p>
        )}
        {texte.trim() && etat === 'pret' && !ouvert && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Aucune commune trouvée pour « {texte} ».</p>
        )}

        {ouvert && (
          <ul
            id={idListe}
            role="listbox"
            className="verre absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-2xl p-1.5 [--verre-fond:1]"
          >
            {resultats.map((commune, i) => (
              <li
                key={`${commune.nom}-${commune.codesPostaux[0]}`}
                id={`${idListe}-${i}`}
                role="option"
                aria-selected={i === actif}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisir(versLieu(commune))}
                onMouseEnter={() => setActif(i)}
                className={`flex min-h-11 cursor-pointer items-center justify-between rounded-xl px-3 ${
                  i === actif ? 'bg-ocean-600 text-white' : ''
                }`}
              >
                <span className="font-medium">{commune.nom}</span>
                <span className={`text-sm ${i === actif ? 'text-ocean-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {commune.codesPostaux[0]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
