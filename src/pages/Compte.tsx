import { Download, Monitor, Moon, Settings2, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ChampLieu } from '../carte/ChampLieu'
import { SectionConnexion } from '../compte/SectionConnexion'
import { exporterDonnees } from '../compte/donnees'
import { Compteur, Puces, Reglage, Segments } from '../config/Controles'
import { INTERETS_UI, LOGEMENTS_UI, STYLES_UI } from '../config/libelles'
import type { Interet, Style, TypeLogement } from '../domain/types'
import { LOGEMENTS_COURTS } from '../engine/logements'
import { usePreferences, type Theme } from '../store/preferences'
import { useVoyage } from '../store/voyage'
import { EnTetePage } from '../ui/EnTetePage'

const carte = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10'

export default function Compte() {
  const prefs = usePreferences()
  const nouveauVoyage = useVoyage((s) => s.nouveauVoyage)
  const [message, setMessage] = useState<string | null>(null)

  function afficher(texte: string) {
    setMessage(texte)
    setTimeout(() => setMessage(null), 3500)
  }

  return (
    <div className="min-h-dvh">
      <EnTetePage titre="Compte" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 py-4">
        <SectionConnexion onMessage={afficher} />

        <section className={carte} aria-labelledby="titre-preferences">
          <h2 id="titre-preferences" className="flex items-center gap-2 font-semibold">
            <Settings2 className="size-5 text-ocean-700 dark:text-ocean-300" aria-hidden /> Préférences par défaut
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">Reprises dans chaque nouveau voyage. Vous pouvez toujours les changer voyage par voyage.</p>
          <div className="mt-4 space-y-5">
            <Reglage libelle="Ville de départ">
              <ChampLieu
                libelle="Ville de départ"
                placeholder="Ex. : Troyes"
                valeur={prefs.villeDepart}
                onChoisir={(villeDepart) => prefs.modifier({ villeDepart })}
                pastille={<span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-ocean-700 text-xs font-bold text-white">A</span>}
              />
            </Reglage>
            <div className="grid gap-5 sm:grid-cols-2">
              <Reglage libelle="Adultes">
                <Compteur libelle="Adultes" valeur={prefs.adultes} min={1} max={12} onChange={(adultes) => prefs.modifier({ adultes })} />
              </Reglage>
              <Reglage libelle="Enfants">
                <Compteur libelle="Enfants" valeur={prefs.enfants} min={0} max={10} onChange={(enfants) => prefs.modifier({ enfants })} />
              </Reglage>
            </div>
            <Reglage libelle="Style">
              <Segments<Style> nom="Style par défaut" valeur={prefs.style} onChange={(style) => prefs.modifier({ style })} options={(Object.keys(STYLES_UI) as Style[]).map((s) => ({ valeur: s, ...STYLES_UI[s] }))} />
            </Reglage>
            <Reglage libelle="Logements préférés">
              <Puces<TypeLogement>
                nom="Logements préférés"
                valeurs={prefs.logements}
                onChange={(logements) => logements.length && prefs.modifier({ logements })}
                options={LOGEMENTS_COURTS.map((l) => ({ valeur: l, ...LOGEMENTS_UI[l] }))}
              />
            </Reglage>
            <Reglage libelle="Centres d’intérêt">
              <Puces<Interet> nom="Centres d’intérêt par défaut" valeurs={prefs.interets} onChange={(interets) => prefs.modifier({ interets })} options={(Object.keys(INTERETS_UI) as Interet[]).map((i) => ({ valeur: i, ...INTERETS_UI[i] }))} />
            </Reglage>
            <Reglage libelle="Configuration">
              <Segments<'simple' | 'avance'>
                nom="Mode de configuration par défaut"
                valeur={prefs.modeAvance ? 'avance' : 'simple'}
                onChange={(m) => prefs.modifier({ modeAvance: m === 'avance' })}
                colonnes="grid-cols-2"
                options={[
                  { valeur: 'simple', libelle: 'Simple', detail: 'Quelques questions' },
                  { valeur: 'avance', libelle: 'Avancé', detail: 'Tous les réglages' },
                ]}
              />
            </Reglage>
            <button
              type="button"
              onClick={() => {
                nouveauVoyage()
                afficher('Préférences appliquées : un nouveau voyage vous attend dans Explorer.')
              }}
              className="h-11 rounded-full bg-ocean-50 px-4 text-sm font-semibold text-ocean-800 ring-1 ring-ocean-200 hover:bg-ocean-100 dark:bg-white/5 dark:text-ocean-100 dark:ring-white/10"
            >
              Commencer un nouveau voyage avec ces préférences
            </button>
          </div>
        </section>

        <section className={carte} aria-labelledby="titre-theme">
          <h2 id="titre-theme" className="font-semibold">
            Apparence
          </h2>
          <div className="mt-3">
            <Segments<Theme>
              nom="Thème"
              valeur={prefs.theme}
              onChange={(theme) => prefs.modifier({ theme })}
              options={[
                { valeur: 'clair', libelle: 'Clair', icone: Sun },
                { valeur: 'sombre', libelle: 'Sombre', icone: Moon },
                { valeur: 'auto', libelle: 'Automatique', icone: Monitor },
              ]}
            />
          </div>
        </section>

        <section className={carte} aria-labelledby="titre-donnees">
          <h2 id="titre-donnees" className="font-semibold">
            Mes données
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={exporterDonnees} className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900/5 px-4 text-sm font-semibold hover:bg-slate-900/10 dark:bg-white/10 dark:hover:bg-white/15">
              <Download className="size-4" aria-hidden /> Exporter mes données (JSON)
            </button>
            <SectionConnexion.BoutonSuppression onMessage={afficher} icone={Trash2} />
          </div>
        </section>
      </main>

      {message && (
        <p role="status" className="fixed inset-x-4 bottom-[calc(var(--nav-bas)+1rem)] z-40 mx-auto max-w-sm rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm text-white shadow-lg">
          {message}
        </p>
      )}
    </div>
  )
}
