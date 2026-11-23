/** Fond coloré et flou sur lequel les surfaces « verre » prennent leur relief. */
export function Fond() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-ocean-100 via-ocean-50 to-orange-50 dark:from-ocean-950 dark:via-slate-950 dark:to-ocean-900" />
      <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-ocean-300/60 blur-3xl dark:bg-ocean-600/35" />
      <div className="absolute top-1/3 -right-40 size-[30rem] rounded-full bg-corail-300/50 blur-3xl dark:bg-corail-600/20" />
      <div className="absolute -bottom-48 left-1/4 size-[32rem] rounded-full bg-amber-200/60 blur-3xl dark:bg-ocean-400/15" />
    </div>
  )
}
