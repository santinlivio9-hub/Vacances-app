import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { decoderVoyage } from '../engine/partage'
import { useVoyage } from '../store/voyage'

/** Ouvre un voyage reçu par lien : on recharge ses réglages puis on recalcule. */
export default function Partage() {
  const [params] = useSearchParams()
  const voyage = decoderVoyage(params.get('v') ?? '')
  const chargerVoyage = useVoyage((s) => s.chargerVoyage)
  const [charge, setCharge] = useState(false)
  useEffect(() => {
    if (!voyage) return
    chargerVoyage(voyage)
    setCharge(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (voyage) return charge ? <Navigate to="/calcul" replace /> : null
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">Lien de voyage illisible</h1>
      <p className="text-slate-600 dark:text-slate-300">Ce lien est incomplet ou abîmé. Demandez à la personne de vous le renvoyer, ou préparez votre propre voyage.</p>
      <Link to="/" className="rounded-2xl bg-ocean-700 px-5 py-3 font-semibold text-white">
        Aller à la carte
      </Link>
    </main>
  )
}
