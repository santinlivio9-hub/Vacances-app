import { Check, Loader2, Mail, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'

export const LONGUEUR_CODE = 6

/** « alice@example.com » → « al•••e@example.com » */
export function masquerEmail(email: string): string {
  const [nom, domaine] = email.split('@')
  if (!nom || !domaine) return email
  if (nom.length <= 3) return `${nom[0]}•••@${domaine}`
  return `${nom.slice(0, 2)}•••${nom.slice(-1)}@${domaine}`
}

/** Décalage vertical des cases (référence « Glassy OTP » : les carrés ne sont pas tous alignés). */
const DECALAGES = [-3, 2, -1, 3, -2, 1]

type Etat = 'saisie' | 'verification' | 'succes' | 'erreur'

/**
 * Saisie du code reçu par e-mail, dans une fenêtre de verre chaud (référence « Glassy OTP »).
 * Un seul champ (collage et remplissage automatique iOS) affiché sous forme de 6 cases de verre en relief.
 * Une fois le code bon : les cases se rejoignent en un carré vert, le bouton devient « Vérifié ».
 */
export function SaisieCode({
  email,
  verifier,
  renvoyer,
  onTermine,
  onChangerEmail,
  delaiRenvoi = 30,
  focusAuto = true,
}: {
  email: string
  verifier: (code: string) => Promise<void>
  renvoyer: () => Promise<void>
  /** Appelé à la fin de l'animation de réussite */
  onTermine?: () => void
  onChangerEmail?: () => void
  delaiRenvoi?: number
  focusAuto?: boolean
}) {
  const id = useId()
  const champ = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState('')
  const [etat, setEtat] = useState<Etat>('saisie')
  const [probleme, setProbleme] = useState<string | null>(null)
  const [reste, setReste] = useState(delaiRenvoi)
  const secousse = useAnimationControls()

  useEffect(() => {
    if (reste <= 0) return
    const t = setTimeout(() => setReste((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [reste])

  async function valider(c = code) {
    if (c.length !== LONGUEUR_CODE || etat === 'verification' || etat === 'succes') return
    setEtat('verification')
    setProbleme(null)
    try {
      await verifier(c)
      setEtat('succes')
      setTimeout(() => onTermine?.(), 1600)
    } catch (e) {
      setEtat('erreur')
      setProbleme(e && typeof e === 'object' && 'message' in e ? traduire(String((e as { message: string }).message)) : 'Code incorrect.')
      void secousse.start({
        x: [0, -10, 10, -6, 6, 0],
        transition: { duration: 0.4 },
      })
      setCode('')
      champ.current?.focus()
    }
  }

  const succes = etat === 'succes'
  const chiffres = Array.from({ length: LONGUEUR_CODE }, (_, i) => code[i] ?? '')
  const active = Math.min(code.length, LONGUEUR_CODE - 1)

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] p-3 sm:p-5">
      {/* Photo d'intérieur floutée, en dégradés (aucun appel réseau) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 scale-110 blur-xl"
        style={{
          background:
            'radial-gradient(circle at 18% 22%, #f6dcbc 0 16%, transparent 34%), radial-gradient(circle at 82% 28%, #5b3a26 0 14%, transparent 32%), radial-gradient(circle at 55% 88%, #c98a52 0 18%, transparent 36%), linear-gradient(135deg, #8a6446, #e3c39d 45%, #3c2a1e)',
        }}
      />
      <motion.div animate={secousse} className="verre-chaud mx-auto max-w-sm rounded-[1.75rem] px-4 pt-6 pb-4 text-center text-white sm:px-6">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/18 shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_8px_20px_-8px_rgb(0_0_0/0.5)] ring-1 ring-white/30">
          <Mail className="size-6" aria-hidden />
        </span>
        <h3 className="mt-3 text-lg font-semibold">Regardez vos e-mails</h3>
        <p className="mt-1 text-sm text-white/85">
          Entrez le code à {LONGUEUR_CODE} chiffres envoyé à <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-medium whitespace-nowrap">{masquerEmail(email)}</span>
        </p>

        <label htmlFor={id} className="sr-only">
          Code reçu par e-mail
        </label>
        <div className="relative mx-auto mt-5 h-20 max-w-[19rem]">
          <AnimatePresence>
            {!succes &&
              chiffres.map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  initial={false}
                  animate={{ y: DECALAGES[i], scale: ch ? [1.12, 1] : 1 }}
                  exit={{
                    x: `${(2.5 - i) * 115}%`,
                    y: 4,
                    scale: 0.55,
                    opacity: 0,
                    transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] },
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  className={`absolute top-3 grid h-14 w-[calc((100%-2.5rem)/6)] place-items-center rounded-2xl text-2xl font-semibold tabular-nums shadow-[inset_0_1px_0_rgb(255_255_255/0.55),inset_0_-2px_6px_rgb(0_0_0/0.18),0_8px_16px_-8px_rgb(0_0_0/0.45)] ring-1 transition-colors ${
                    etat === 'erreur' ? 'bg-[#e5484d]/25 ring-[#ffb4ab]/60' : i === active && etat === 'saisie' ? 'bg-white/28 ring-white/80' : 'bg-white/16 ring-white/35'
                  }`}
                  style={{
                    left: `calc(${i} * ((100% - 2.5rem) / 6 + 0.5rem))`,
                  }}
                >
                  {ch}
                </motion.span>
              ))}
          </AnimatePresence>
          <AnimatePresence>
            {succes && (
              <motion.span
                key="ok"
                initial={{ scale: 0, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 16,
                  delay: 0.3,
                }}
                className="absolute top-2 left-[calc(50%-2rem)] grid size-16 place-items-center rounded-2xl bg-[linear-gradient(160deg,#5ee39a,#1fa760)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_10px_26px_-8px_rgb(31_167_96/0.8)]"
              >
                <Check className="size-8" strokeWidth={3} aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
          <input
            ref={champ}
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={LONGUEUR_CODE}
            value={code}
            disabled={etat === 'verification' || succes}
            autoFocus={focusAuto}
            onChange={(e) => {
              const c = e.target.value.replace(/\D/g, '').slice(0, LONGUEUR_CODE)
              setCode(c)
              if (etat === 'erreur') setEtat('saisie')
              if (c.length === LONGUEUR_CODE) void valider(c)
            }}
            className="absolute inset-0 size-full cursor-text bg-transparent text-transparent caret-transparent opacity-0"
          />
        </div>

        <button
          type="button"
          onClick={() => void valider()}
          disabled={code.length !== LONGUEUR_CODE || etat === 'verification' || succes}
          className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_10px_24px_-10px_rgb(0_0_0/0.5)] transition-colors duration-300 ${
            succes ? 'bg-[#1f9d5a] text-white' : 'bg-white text-[#3a2617] disabled:bg-white/55 disabled:text-[#3a2617]/70'
          }`}
        >
          {etat === 'verification' ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Vérification…
            </>
          ) : succes ? (
            <>
              <Check className="size-4" strokeWidth={3} aria-hidden /> Vérifié
            </>
          ) : (
            'Valider le code'
          )}
        </button>

        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-[#ffd9d4]">
          {probleme}
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-white/80">
          Pas reçu ?
          <button
            type="button"
            disabled={reste > 0 || succes}
            onClick={() =>
              renvoyer()
                .then(() => setReste(delaiRenvoi))
                .catch((e) => setProbleme(e?.message ? traduire(String(e.message)) : 'Envoi impossible.'))
            }
            className="inline-flex min-h-9 items-center gap-1 font-semibold text-white underline-offset-2 hover:underline disabled:font-normal disabled:text-white/70 disabled:no-underline"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {reste > 0 ? `Renvoyer le code (0:${String(reste).padStart(2, '0')})` : 'Renvoyer le code'}
          </button>
          {onChangerEmail && (
            <button type="button" onClick={onChangerEmail} disabled={succes} className="min-h-9 text-white/80 underline-offset-2 hover:underline">
              · Changer d’adresse
            </button>
          )}
        </p>
      </motion.div>
    </div>
  )
}

/** Messages Supabase les plus courants, en français. */
function traduire(m: string): string {
  if (/expired|invalid/i.test(m)) return 'Code incorrect ou expiré. Vérifiez le dernier e-mail reçu.'
  if (/rate|seconds/i.test(m)) return 'Trop de demandes : patientez quelques secondes.'
  return m
}
