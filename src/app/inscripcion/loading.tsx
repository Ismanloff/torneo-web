export default function InscripcionLoading() {
  return (
    <main className="public-arena">
      <div className="public-shell">
        {/* hero skeleton */}
        <section className="public-hero">
          <div className="public-wrap py-12 lg:py-16">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="h-10 w-2/3 animate-pulse rounded-lg bg-white/10" />
              <div className="h-4 w-full animate-pulse rounded bg-white/[0.06]" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" />
            </div>
          </div>
        </section>
        {/* grid of card skeletons */}
        <section className="public-section py-12">
          <div className="public-wrap">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="rounded-[1.6rem] border border-white/[0.08] bg-white/[0.03] p-6 animate-pulse">
                  <div className="h-3 w-20 rounded-full bg-white/10" />
                  <div className="mt-4 h-6 w-3/4 rounded bg-white/10" />
                  <div className="mt-3 h-2 w-full rounded-full bg-white/[0.06]" />
                  <div className="mt-4 h-9 w-28 rounded-full bg-white/[0.06]" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
