import { ArrowLeft, Compass, Heart, Luggage, Plane, TrainFront, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Segments } from '../config/Controles'
import { usePreferences, type EffetVerre, type Theme } from '../store/preferences'
import { AnneauBudget, BadgeEcart, Glass, LiquidSelector, Montant, useCibleActive, type FormeVerre, type TeinteVerre, type VarianteVerre } from '../ui/glass'
import { COUCHES_MAX } from '../ui/tokens'

/** Fond chaud et contrasté, comme la photo de la référence « Glassy Dashboard » (sans appel réseau). */
const FOND_PHOTO =
  'radial-gradient(circle at 15% 20%, #f4d7b5 0 14%, transparent 30%), radial-gradient(circle at 80% 30%, #5b3a26 0 12%, transparent 28%), radial-gradient(circle at 60% 85%, #c98a52 0 15%, transparent 32%), linear-gradient(135deg, #8a6446, #e9cfae 45%, #3c2a1e)'

const ONGLETS = [
  { id: 'explorer', libelle: 'Explorer', icone: Compass },
  { id: 'voyages', libelle: 'Voyages', icone: Luggage },
  { id: 'favoris', libelle: 'Favoris', icone: Heart },
  { id: 'compte', libelle: 'Compte', icone: UserRound },
]

function DemoCapsule() {
  const [actif, setActif] = useState('voyages')
  const ref = useRef<HTMLDivElement>(null)
  const { cible, taille } = useCibleActive(ref, actif)
  return (
    <div ref={ref} className="verre-bleu refraction relative grid h-16 max-w-md grid-cols-4 rounded-full p-1.5">
      <LiquidSelector cible={cible} taille={taille} />
      {ONGLETS.map((o) => (
        <button key={o.id} type="button" data-actif={o.id === actif} onClick={() => setActif(o.id)} className={`relative z-10 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${o.id === actif ? 'text-[#0c2452]' : 'text-white/90'}`}>
          <o.icone className="size-5" aria-hidden />
          {o.libelle}
        </button>
      ))}
    </div>
  )
}

function DemoRail() {
  const [actif, setActif] = useState('voyages')
  const ref = useRef<HTMLDivElement>(null)
  const { cible, taille } = useCibleActive(ref, actif)
  return (
    <div ref={ref} className="verre-bleu refraction relative h-80 w-64 overflow-hidden rounded-[2.25rem]">
      <LiquidSelector cible={cible} taille={taille} mode="rail" rail={56} rayon={18} />
      <div className="relative z-10 flex flex-col gap-2 py-4 pl-3" style={{ paddingRight: 68 }}>
        {ONGLETS.map((o) => (
          <button key={o.id} type="button" data-actif={o.id === actif} onClick={() => setActif(o.id)} className={`flex h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold ${o.id === actif ? 'text-[#0c2452]' : 'bg-white/8 text-white/90 ring-1 ring-white/12'}`}>
            <o.icone className="size-5" aria-hidden />
            {o.libelle}
          </button>
        ))}
      </div>
      <span className="texte-vertical absolute right-0 bottom-4 z-10 grid w-14 place-items-center text-[11px] font-semibold tracking-[0.3em] text-[#0c2452] uppercase opacity-60">{ONGLETS.find((o) => o.id === actif)?.libelle}</span>
    </div>
  )
}

/** Page cachée (#/design) : tous les composants de verre, à vérifier dans les deux thèmes. */
export default function Design() {
  const prefs = usePreferences()
  const variantes: VarianteVerre[] = ['regular', 'clear', 'thick']
  const formes: FormeVerre[] = ['capsule', 'rounded', 'circle']
  const teintes: TeinteVerre[] = ['aucune', 'ocean', 'corail', 'vert', 'bleu']
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-16">
      <header className="flex items-center gap-3">
        <Link to="/" className="grid size-11 place-items-center rounded-full verre" aria-label="Retour">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Liquid Glass</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Composants de verre de la v6 · au plus {COUCHES_MAX} couches visibles par écran</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium">Thème</p>
          <Segments<Theme> nom="Thème" valeur={prefs.theme} onChange={(theme) => prefs.modifier({ theme })} options={[{ valeur: 'clair', libelle: 'Clair' }, { valeur: 'sombre', libelle: 'Sombre' }, { valeur: 'auto', libelle: 'Auto' }]} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Effet verre</p>
          <Segments<EffetVerre> nom="Effet verre" valeur={prefs.effetVerre} onChange={(effetVerre) => prefs.modifier({ effetVerre })} options={[{ valeur: 'complet', libelle: 'Complet' }, { valeur: 'leger', libelle: 'Léger' }, { valeur: 'desactive', libelle: 'Désactivé' }, { valeur: 'auto', libelle: 'Auto' }]} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Sélection liquide</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Un seul tracé SVG : le bord qui avance part plus vite que celui qui suit, la forme s’étire puis se resserre.</p>
        <div className="flex flex-col items-start gap-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_top,#1d3f8a,#050b1f_70%)] p-5 sm:flex-row">
          <DemoRail />
          <div className="w-full min-w-0 flex-1">
            <DemoCapsule />
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden rounded-[2rem] p-5">
        <div className="absolute inset-0 -z-10" style={{ background: FOND_PHOTO }} />
        <div className="absolute inset-0 -z-10 bg-black/10" />
        <h2 className="mb-3 font-semibold text-white drop-shadow">Variantes, formes et teintes</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {variantes.map((v) => (
            <Glass key={v} variante={v} interactif className="p-4">
              <p className="text-xs font-medium opacity-70">variante « {v} »</p>
              <Montant valeur={1926733} className="text-2xl" />
            </Glass>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {formes.map((f) => (
            <Glass key={f} forme={f} interactif className={`grid place-items-center ${f === 'circle' ? 'size-14' : 'h-12 px-5'}`}>
              {f === 'circle' ? <Plane className="size-5" aria-hidden /> : <span className="text-sm font-semibold">{f}</span>}
            </Glass>
          ))}
          {teintes.map((t) => (
            <Glass key={t} teinte={t} forme="capsule" interactif className="flex h-12 items-center gap-2 px-4 text-sm font-semibold">
              <TrainFront className="size-4" aria-hidden /> {t}
            </Glass>
          ))}
        </div>
        <Glass variante="thick" refraction className="mt-3 p-5">
          <p className="text-xs font-medium opacity-70">Estimation totale</p>
          <Montant valeur={985} unite="/ 2 pers." className="text-5xl" />
          <p className="mt-1 text-sm opacity-75">entre 810 et 1 210 €</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {[0.55, 0.88, 1.24].map((r) => (
              <span key={r} className="flex items-center gap-2">
                <AnneauBudget ratio={r} />
                <BadgeEcart total={1000 * r} budget={1000} />
              </span>
            ))}
          </div>
        </Glass>
      </section>
    </div>
  )
}
