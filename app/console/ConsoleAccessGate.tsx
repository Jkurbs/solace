import Link from 'next/link';

import Mark from '@/app/Mark';

export default function ConsoleAccessGate({ denied = false }: { denied?: boolean }) {
  return (
    <main className="min-h-screen bg-[#10100e] text-neutral-50">
      <header className="border-b border-neutral-800 bg-[#10100e]/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <Link href="/hermes" className="text-sm font-bold text-neutral-400 transition-colors hover:text-neutral-50">
            Hermes
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-md place-items-center px-5 py-16">
        <form
          action="/api/console/access"
          method="post"
          className="w-full rounded-lg border border-neutral-800 bg-[#181715] p-6 shadow-2xl shadow-black/20"
        >
          <p className="text-sm font-medium text-neutral-400">Solace Console</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-neutral-50">Operator access required</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Enter the private console code to view internal systems and contracts.
          </p>

          <label htmlFor="console-code" className="mt-6 block text-sm font-medium text-neutral-300">
            Console code
          </label>
          <input
            id="console-code"
            name="code"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 h-11 w-full rounded-md border border-neutral-700 bg-[#10100e] px-3 text-base text-neutral-50 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
            placeholder="Enter code"
          />
          {denied ? (
            <p className="mt-3 text-sm text-red-300" role="alert">
              That code did not match.
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-neutral-50 px-4 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            Enter console
          </button>
        </form>
      </section>
    </main>
  );
}
