export default function StaffAppLoading() {
  return (
    <div className="grid gap-5">
      {/* Next match card skeleton */}
      <section>
        <div className="mb-3 h-3 w-32 animate-pulse rounded bg-white/10" />
        <div className="app-panel-strong animate-pulse">
          <div className="h-5 w-3/4 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.06]" />
          <div className="mt-2 h-4 w-1/3 rounded bg-white/[0.06]" />
        </div>
      </section>

      {/* Quick action buttons skeleton */}
      <section className="grid grid-cols-2 gap-3">
        <div className="app-panel flex animate-pulse flex-col items-center gap-2 py-5">
          <div className="h-6 w-6 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/[0.06]" />
        </div>
        <div className="app-panel flex animate-pulse flex-col items-center gap-2 py-5">
          <div className="h-6 w-6 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/[0.06]" />
        </div>
      </section>

      {/* Today's matches list skeleton */}
      <section>
        <div className="mb-3 h-3 w-40 animate-pulse rounded bg-white/10" />
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="app-soft-card flex animate-pulse items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-10 rounded bg-white/10" />
                <div className="h-4 w-36 rounded bg-white/[0.06]" />
              </div>
              <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
