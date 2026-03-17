export default function CategoryRegistrationLoading() {
  return (
    <main className="public-arena">
      <div className="public-shell">
        {/* hero section skeleton */}
        <section className="public-hero">
          <div className="public-wrap py-10 lg:py-14">
            <div className="mx-auto max-w-2xl">
              <div className="public-glass p-6 lg:p-8 animate-pulse space-y-4">
                <div className="h-3 w-24 rounded-full bg-white/10" />
                <div className="h-3 w-36 rounded-full bg-white/[0.06]" />
                <div className="h-9 w-2/3 rounded-lg bg-white/10" />
                <div className="h-4 w-full rounded bg-white/[0.06]" />
              </div>
            </div>
          </div>
        </section>
        {/* form skeleton */}
        <section className="public-section pt-8 pb-20">
          <div className="public-wrap max-w-2xl mx-auto">
            <div className="public-glass p-6 lg:p-8 animate-pulse space-y-5">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-28 rounded bg-white/10" />
                  <div className="h-11 w-full rounded-xl bg-white/[0.06]" />
                </div>
              ))}
              <div className="pt-2">
                <div className="h-12 w-full rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
