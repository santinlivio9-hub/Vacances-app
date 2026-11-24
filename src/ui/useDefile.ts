import { useEffect, useState } from 'react'

/** Vrai dès que la page a défilé de plus de `seuil` pixels (pour faire apparaître le verre des en-têtes). */
export function useDefile(seuil = 8): boolean {
  const [defile, setDefile] = useState(() => typeof window !== 'undefined' && window.scrollY > seuil)
  useEffect(() => {
    const suivre = () => setDefile(window.scrollY > seuil)
    suivre()
    window.addEventListener('scroll', suivre, { passive: true })
    return () => window.removeEventListener('scroll', suivre)
  }, [seuil])
  return defile
}

/** Classes d'un en-tête collant : transparent en haut de page, verre une fois qu'on défile. */
export const classeEnTeteVerre = (defile: boolean) =>
  `transition-[background-color,border-color,box-shadow] duration-300 ${defile ? 'verre rounded-none border-x-0! border-t-0! [--verre-fond:0.72] dark:[--verre-fond:0.6]' : 'border-b border-transparent bg-transparent'}`
