import { Cloud, CloudOff, Loader2, LogOut, Mail, RefreshCw, UserRound, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { compteConfigure, connexionGoogle, deconnexion, envoyerLienMagique, repondreImport, supprimerCompte, synchroniserMaintenant, useCompte } from './compte'
import { effacerDonneesLocales } from './donnees'

const carte = 'rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-[#0e1f45] dark:ring-white/10'
const texteErreur = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Une erreur est survenue.')

function LogoGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  )
}

function Avatar({ nom, image }: { nom?: string; image?: string }) {
  const [ko, setKo] = useState(false)
  return (
    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-ocean-100 text-xl font-bold text-ocean-700 dark:bg-ocean-800 dark:text-ocean-100">
      {image && !ko ? <img src={image} alt="" referrerPolicy="no-referrer" onError={() => setKo(true)} className="size-full object-cover" /> : nom ? nom.charAt(0).toUpperCase() : <UserRound className="size-7" aria-hidden />}
    </span>
  )
}

/** Connexion (lien magique ou Google), état de la synchronisation, import des données de l'appareil. */
export function SectionConnexion({ onMessage }: { onMessage: (t: string) => void }) {
  const { statut, utilisateur, synchro, importPropose, erreur } = useCompte()
  const [email, setEmail] = useState('')
  const [envoi, setEnvoi] = useState<'idle' | 'envoi' | 'envoye'>('idle')
  const [probleme, setProbleme] = useState<string | null>(null)

  if (!compteConfigure) {
    return (
      <section className={carte} aria-labelledby="titre-connexion">
        <div className="flex items-center gap-3">
          <Avatar />
          <div className="min-w-0">
            <h2 id="titre-connexion" className="font-semibold">
              Mode invité
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Vos voyages, favoris et préférences sont enregistrés sur cet appareil.</p>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-900/5 px-3 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          La connexion n’est pas encore activée sur ce site : tout fonctionne sans compte.
        </p>
      </section>
    )
  }

  if (statut === 'chargement') {
    return (
      <section className={`${carte} flex items-center gap-3`} aria-busy="true">
        <Loader2 className="size-5 animate-spin text-ocean-700" aria-hidden /> Connexion en cours…
      </section>
    )
  }

  if (statut === 'connecte' && utilisateur) {
    return (
      <section className={carte} aria-labelledby="titre-connexion">
        <div className="flex items-center gap-3">
          <Avatar nom={utilisateur.nom} image={utilisateur.avatar} />
          <div className="min-w-0 flex-1">
            <h2 id="titre-connexion" className="truncate font-semibold">
              {utilisateur.nom}
            </h2>
            <p className="truncate text-sm text-slate-600 dark:text-slate-300">{utilisateur.email}</p>
          </div>
        </div>
        <p className={`mt-3 flex items-center gap-2 text-sm ${synchro === 'erreur' ? 'text-(--statut-depasse-texte)' : 'text-slate-600 dark:text-slate-300'}`} role="status">
          {synchro === 'en-cours' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : synchro === 'erreur' ? <CloudOff className="size-4" aria-hidden /> : <Cloud className="size-4" aria-hidden />}
          {synchro === 'en-cours' ? 'Synchronisation…' : synchro === 'erreur' ? `Synchronisation impossible : ${erreur ?? 'réessayez plus tard'}` : 'Voyages, favoris et préférences synchronisés'}
        </p>

        {importPropose && (
          <div role="alertdialog" aria-labelledby="titre-import" className="mt-3 rounded-2xl bg-ocean-50 p-3 ring-1 ring-ocean-200 dark:bg-ocean-900/40 dark:ring-ocean-700">
            <p id="titre-import" className="font-semibold">
              Importer les données de cet appareil ?
            </p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              {importPropose.voyages} voyage{importPropose.voyages > 1 ? 's' : ''} et {importPropose.favoris} favori{importPropose.favoris > 1 ? 's' : ''} sont enregistrés ici. Les ajouter à votre compte pour les retrouver partout ?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void repondreImport(true).then(() => onMessage('Données importées dans votre compte.'))} className="h-11 rounded-full bg-ocean-700 px-4 text-sm font-semibold text-white">
                Importer
              </button>
              <button type="button" onClick={() => void repondreImport(false)} className="h-11 rounded-full px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-900/15 dark:text-slate-200 dark:ring-white/15">
                Non, garder seulement le compte
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void synchroniserMaintenant()} className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900/5 px-4 text-sm font-semibold hover:bg-slate-900/10 dark:bg-white/10">
            <RefreshCw className="size-4" aria-hidden /> Synchroniser
          </button>
          <button type="button" onClick={() => void deconnexion().then(() => onMessage('Vous êtes déconnecté. Vos données restent sur cet appareil.'))} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-900/15 dark:text-slate-200 dark:ring-white/15">
            <LogOut className="size-4" aria-hidden /> Se déconnecter
          </button>
        </div>
      </section>
    )
  }

  // Invité, connexion possible
  return (
    <section className={carte} aria-labelledby="titre-connexion">
      <div className="flex items-center gap-3">
        <Avatar />
        <div className="min-w-0">
          <h2 id="titre-connexion" className="font-semibold">
            Se connecter
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Pour retrouver vos voyages et favoris sur tous vos appareils. Facultatif : sans compte, tout reste sur cet appareil.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => connexionGoogle().catch((e) => setProbleme(texteErreur(e)))}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-slate-800 ring-1 ring-slate-900/15 hover:bg-slate-50 dark:bg-white/10 dark:text-white dark:ring-white/15"
      >
        <LogoGoogle /> Continuer avec Google
      </button>
      <div className="my-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400" aria-hidden>
        <span className="h-px flex-1 bg-slate-900/10 dark:bg-white/10" /> ou <span className="h-px flex-1 bg-slate-900/10 dark:bg-white/10" />
      </div>
      {envoi === 'envoye' ? (
        <p role="status" className="flex items-start gap-2 rounded-2xl bg-(--statut-ok)/12 px-3 py-2.5 text-sm text-(--statut-ok-texte)">
          <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
          Lien envoyé à {email}. Ouvrez-le sur cet appareil, dans ce navigateur, pour vous connecter.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setProbleme(null)
            setEnvoi('envoi')
            envoyerLienMagique(email.trim())
              .then(() => setEnvoi('envoye'))
              .catch((err) => {
                setEnvoi('idle')
                setProbleme(texteErreur(err))
              })
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="email-connexion" className="sr-only">
            Adresse e-mail
          </label>
          <input
            id="email-connexion"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 min-w-0 rounded-2xl bg-slate-50 px-4 text-base sm:flex-1 ring-1 ring-slate-900/10 dark:bg-white/5 dark:ring-white/10"
          />
          <button type="submit" disabled={envoi === 'envoi'} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-ocean-700 px-4 font-semibold text-white disabled:opacity-60">
            {envoi === 'envoi' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
            Recevoir un lien
          </button>
        </form>
      )}
      {(probleme || erreur) && (
        <p role="alert" className="mt-2 text-sm text-(--statut-depasse-texte)">
          {probleme ?? erreur}
        </p>
      )}
    </section>
  )
}

/** Supprimer le compte (connecté) ou effacer les données de l'appareil (invité). */
SectionConnexion.BoutonSuppression = function BoutonSuppression({ onMessage, icone: Icone }: { onMessage: (t: string) => void; icone: LucideIcon }) {
  const connecte = useCompte((s) => s.statut === 'connecte')
  return (
    <button
      type="button"
      onClick={() => {
        if (connecte) {
          if (!window.confirm('Supprimer définitivement votre compte, avec vos voyages, favoris et préférences (sur le compte et sur cet appareil) ?')) return
          supprimerCompte()
            .then(() => onMessage('Compte supprimé.'))
            .catch((e) => onMessage(`Suppression impossible : ${texteErreur(e)}`))
          return
        }
        if (!window.confirm('Effacer vos voyages, favoris et préférences de cet appareil ? Cette action est définitive.')) return
        effacerDonneesLocales()
        onMessage('Données effacées de cet appareil.')
      }}
      className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 dark:text-red-300 dark:ring-red-900 dark:hover:bg-red-950/40"
    >
      <Icone className="size-4" aria-hidden /> {connecte ? 'Supprimer mon compte' : 'Effacer les données de cet appareil'}
    </button>
  )
}
