import Mark from '@/app/Mark';

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-50">
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-[#0a0a0a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            <Mark size={22} />
            Solace
          </div>
          <div className="h-8 w-28 animate-pulse rounded-md bg-neutral-800" />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-lg border border-neutral-800 bg-[#0d0d0b] p-6 sm:p-8">
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-800" />
          <div className="mt-4 h-14 w-64 animate-pulse rounded bg-neutral-800 sm:h-16 sm:w-96" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['Available', 'Strategy', 'PnL', 'Withdrawable'].map((item) => (
              <div key={item} className="grid gap-3">
                <div className="h-3 w-24 animate-pulse rounded bg-neutral-800" />
                <div className="h-7 w-32 animate-pulse rounded bg-neutral-800" />
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="h-72 rounded-lg border border-neutral-800 bg-[#0d0d0b]" />
          <div className="h-72 rounded-lg border border-neutral-800 bg-[#0d0d0b]" />
        </div>
      </div>
    </main>
  );
}
