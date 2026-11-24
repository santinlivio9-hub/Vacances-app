import type { SupabaseClient, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { useFavoris, type Favori } from '../store/favoris'
import { lirePreferences, usePreferences, type Preferences } from '../store/preferences'
import { normaliserSauvegarde, useVoyage, type VoyageSauvegarde } from '../store/voyage'
import { effacerDonneesLocales } from './donnees'
import { differences, empreinte, fusionnerFavoris, fusionnerVoyages, versionFavori, versionVoyage } from './fusion'

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL
const CLE_SUPABASE = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Les comptes ne sont proposés que si le projet Supabase est configuré au moment du build. */
export const compteConfigure = !!URL_SUPABASE && !!CLE_SUPABASE

export interface Utilisateur {
  id: string
  email: string
  nom: string
  avatar?: string
}

interface EtatCompte {
  statut: 'invite' | 'chargement' | 'connecte'
  utilisateur: Utilisateur | null
  synchro: 'ok' | 'en-cours' | 'erreur' | null
  /** Première connexion avec des données sur l'appareil : on propose de les importer */
  importPropose: { voyages: number; favoris: number } | null
  erreur: string | null
}

export const useCompte = create<EtatCompte>()(() => ({
  statut: compteConfigure ? 'chargement' : 'invite',
  utilisateur: null,
  synchro: null,
  importPropose: null,
  erreur: null,
}))

let client: SupabaseClient | null = null
/** Client chargé à la demande : la bibliothèque ne pèse rien en mode invité. */
async function supabase(): Promise<SupabaseClient> {
  if (client) return client
  const { createClient } = await import('@supabase/supabase-js')
  // PKCE : le retour de connexion arrive en « ?code=… », sans toucher au # du routeur
  client = createClient(URL_SUPABASE!, CLE_SUPABASE!, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } })
  return client
}

/** Adresse de retour après connexion : la page d'accueil du site, sans # ni paramètres. */
const adresseRetour = () => `${location.origin}${location.pathname}`

const versUtilisateur = (u: User, profil?: { nom?: string | null; avatar_url?: string | null }): Utilisateur => ({
  id: u.id,
  email: u.email ?? '',
  nom: profil?.nom || (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || (u.email ?? '').split('@')[0],
  avatar: profil?.avatar_url || (u.user_metadata?.avatar_url as string | undefined),
})

const message = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: string }).message) : 'Erreur inconnue')

// --- Synchronisation -------------------------------------------------------

let dejaVoyages = new Map<string, string>()
let dejaFavoris = new Map<string, string>()
let dernieresPrefs = ''
let desabonner: (() => void) | null = null
let minuterie: ReturnType<typeof setTimeout> | null = null

async function envoyerChangements() {
  const u = useCompte.getState().utilisateur
  if (!u) return
  const sb = await supabase()
  const voyages = useVoyage.getState().sauvegardes
  const favoris = useFavoris.getState().favoris
  const dv = differences(dejaVoyages, voyages, versionVoyage)
  const df = differences(dejaFavoris, favoris, versionFavori)
  const prefs = lirePreferences()
  const prefsJson = JSON.stringify(prefs)
  if (!dv.aEnvoyer.length && !dv.aSupprimer.length && !df.aEnvoyer.length && !df.aSupprimer.length && prefsJson === dernieresPrefs) return
  useCompte.setState({ synchro: 'en-cours' })
  try {
    const appels: PromiseLike<{ error: unknown }>[] = []
    if (dv.aEnvoyer.length) appels.push(sb.from('voyages').upsert(dv.aEnvoyer.map((v) => ({ user_id: u.id, id: v.id, donnees: v, maj_le: v.majLe }))))
    if (dv.aSupprimer.length) appels.push(sb.from('voyages').delete().eq('user_id', u.id).in('id', dv.aSupprimer))
    if (df.aEnvoyer.length) appels.push(sb.from('favoris').upsert(df.aEnvoyer.map((f) => ({ user_id: u.id, id: f.id, donnees: f, ajoute_le: f.ajouteLe }))))
    if (df.aSupprimer.length) appels.push(sb.from('favoris').delete().eq('user_id', u.id).in('id', df.aSupprimer))
    if (prefsJson !== dernieresPrefs) appels.push(sb.from('profils').update({ preferences: prefs, maj_le: new Date().toISOString() }).eq('id', u.id))
    const resultats = await Promise.all(appels)
    const echec = resultats.find((r) => r.error)
    if (echec) throw echec.error
    dejaVoyages = empreinte(voyages, versionVoyage)
    dejaFavoris = empreinte(favoris, versionFavori)
    dernieresPrefs = prefsJson
    useCompte.setState({ synchro: 'ok' })
  } catch (e) {
    useCompte.setState({ synchro: 'erreur', erreur: message(e) })
  }
}

const planifierEnvoi = () => {
  if (minuterie) clearTimeout(minuterie)
  minuterie = setTimeout(() => void envoyerChangements(), 800)
}

function suivreLesChangements() {
  desabonner?.()
  const a = useVoyage.subscribe((s, avant) => s.sauvegardes !== avant.sauvegardes && planifierEnvoi())
  const b = useFavoris.subscribe((s, avant) => s.favoris !== avant.favoris && planifierEnvoi())
  const c = usePreferences.subscribe(() => planifierEnvoi())
  desabonner = () => {
    a()
    b()
    c()
  }
}

interface DonneesCompte {
  voyages: VoyageSauvegarde[]
  favoris: Favori[]
  profil: { nom: string | null; avatar_url: string | null; preferences: Partial<Preferences>; import_fait: boolean } | null
}

async function lireCompte(userId: string): Promise<DonneesCompte> {
  const sb = await supabase()
  const [v, f, p] = await Promise.all([
    sb.from('voyages').select('donnees').eq('user_id', userId),
    sb.from('favoris').select('donnees').eq('user_id', userId),
    sb.from('profils').select('nom, avatar_url, preferences, import_fait').eq('id', userId).maybeSingle(),
  ])
  const erreur = v.error ?? f.error ?? p.error
  if (erreur) throw erreur
  return {
    voyages: (v.data ?? []).map((l) => normaliserSauvegarde(l.donnees as VoyageSauvegarde)),
    favoris: (f.data ?? []).map((l) => l.donnees as Favori),
    profil: p.data as DonneesCompte['profil'],
  }
}

/** Applique les données du compte sur l'appareil (avec ou sans les données locales). */
function appliquer(d: DonneesCompte, garderLocal: boolean) {
  const voyages = garderLocal ? fusionnerVoyages(useVoyage.getState().sauvegardes, d.voyages) : d.voyages
  const favoris = garderLocal ? fusionnerFavoris(useFavoris.getState().favoris, d.favoris) : d.favoris
  // Ce qui vient du compte est déjà synchronisé ; le reste partira au prochain envoi
  dejaVoyages = empreinte(d.voyages, versionVoyage)
  dejaFavoris = empreinte(d.favoris, versionFavori)
  useVoyage.getState().remplacerSauvegardes(voyages)
  useFavoris.getState().remplacer(favoris)
  const distantes = d.profil?.preferences as Preferences | undefined
  const locales = lirePreferences()
  if (distantes?.majLe && (!garderLocal || distantes.majLe > locales.majLe)) usePreferences.getState().remplacer({ ...locales, ...distantes })
  dernieresPrefs = garderLocal && !(distantes?.majLe && distantes.majLe > locales.majLe) ? '' : JSON.stringify(lirePreferences())
}

let donneesEnAttente: DonneesCompte | null = null

async function apresConnexion(u: User) {
  useCompte.setState({ statut: 'chargement', erreur: null })
  try {
    const sb = await supabase()
    // Profil créé par le déclencheur SQL ; on le crée ici aussi s'il manque
    await sb.from('profils').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true })
    const d = await lireCompte(u.id)
    useCompte.setState({ statut: 'connecte', utilisateur: versUtilisateur(u, d.profil ?? undefined), synchro: 'ok' })
    const locaux = { voyages: useVoyage.getState().sauvegardes.length, favoris: useFavoris.getState().favoris.length }
    if (!d.profil?.import_fait && (locaux.voyages || locaux.favoris)) {
      // Première connexion avec des données sur l'appareil : on demande avant d'importer
      donneesEnAttente = d
      useCompte.setState({ importPropose: locaux })
      return
    }
    appliquer(d, true)
    if (!d.profil?.import_fait) await sb.from('profils').update({ import_fait: true }).eq('id', u.id)
    suivreLesChangements()
    planifierEnvoi()
  } catch (e) {
    useCompte.setState({ statut: 'connecte', utilisateur: versUtilisateur(u), synchro: 'erreur', erreur: message(e) })
  }
}

// --- Actions ---------------------------------------------------------------

let initialise = false
/** À appeler une fois au démarrage : reprend la session et termine une connexion en cours (?code=…). */
export async function initialiserCompte() {
  if (!compteConfigure || initialise) return
  initialise = true
  try {
    const sb = await supabase()
    sb.auth.onAuthStateChange((evenement, session) => {
      if (evenement === 'SIGNED_OUT') {
        desabonner?.()
        useCompte.setState({ statut: 'invite', utilisateur: null, synchro: null, importPropose: null })
        return
      }
      if ((evenement === 'SIGNED_IN' || evenement === 'INITIAL_SESSION') && session?.user) {
        const actuel = useCompte.getState().utilisateur
        if (actuel?.id !== session.user.id) setTimeout(() => void apresConnexion(session.user), 0)
      } else if (evenement === 'INITIAL_SESSION' && !session) useCompte.setState({ statut: 'invite' })
    })
    // Nettoie l'adresse après le retour de connexion
    if (new URLSearchParams(location.search).has('code')) history.replaceState(null, '', `${location.pathname}${location.hash || '#/compte'}`)
  } catch (e) {
    useCompte.setState({ statut: 'invite', erreur: message(e) })
  }
}

export async function envoyerLienMagique(email: string): Promise<void> {
  const sb = await supabase()
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: adresseRetour() } })
  if (error) throw error
}

export async function connexionGoogle(): Promise<void> {
  const sb = await supabase()
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: adresseRetour() } })
  if (error) throw error
}

export async function deconnexion() {
  await envoyerChangements().catch(() => {})
  const sb = await supabase()
  await sb.auth.signOut()
}

/** Réponse à la proposition d'import des données de l'appareil. */
export async function repondreImport(importer: boolean) {
  const u = useCompte.getState().utilisateur
  const d = donneesEnAttente
  if (!u || !d) return
  donneesEnAttente = null
  useCompte.setState({ importPropose: null })
  appliquer(d, importer)
  const sb = await supabase()
  await sb.from('profils').update({ import_fait: true }).eq('id', u.id)
  suivreLesChangements()
  await envoyerChangements()
}

export async function synchroniserMaintenant() {
  const u = useCompte.getState().utilisateur
  if (!u) return
  try {
    const d = await lireCompte(u.id)
    appliquer(d, true)
    await envoyerChangements()
  } catch (e) {
    useCompte.setState({ synchro: 'erreur', erreur: message(e) })
  }
}

/** Supprime le compte (fonction SQL sécurisée) puis les données de l'appareil. */
export async function supprimerCompte() {
  const sb = await supabase()
  desabonner?.()
  const { error } = await sb.rpc('supprimer_mon_compte')
  if (error) {
    suivreLesChangements()
    throw error
  }
  await sb.auth.signOut({ scope: 'local' }).catch(() => {})
  effacerDonneesLocales()
  useCompte.setState({ statut: 'invite', utilisateur: null, synchro: null })
}
