/** Message temporaire en bas de l'écran, annoncé par les lecteurs d'écran. */
export function Message({ message }: { message: string | null }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 print:hidden lg:bottom-8">
      {message && (
        <p className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-slate-900">{message}</p>
      )}
    </div>
  )
}
