import type { Metadata } from 'next';
import Link from 'next/link';

import Mark from '../Mark';

export const metadata: Metadata = {
  title: 'Solace — Terms of Service',
  description:
    'The terms under which Solace and Hermes are provided. Beta status, no guarantees, access at discretion. June 2026.',
};

const sections = [
  {
    number: '01',
    title: 'Beta status',
    body: [
      'Solace and Hermes are currently provided as a limited beta service. They may change, be interrupted, or be discontinued at any time, without notice.',
    ],
  },
  {
    number: '02',
    title: 'No guarantee',
    body: [
      'Solace makes no guarantees regarding performance, outcomes, profitability, or future results. Nothing on this site is an offer of advisory services or investment advice.',
    ],
  },
  {
    number: '03',
    title: 'Access',
    body: [
      'Access to Hermes and other Solace instruments is granted at Solace’s discretion and may be revoked at any time. Access may be subject to eligibility and applicable regulation.',
    ],
  },
  {
    number: '04',
    title: 'Intellectual property',
    body: [
      'All software, content, branding, and materials remain the property of Solace. Nothing here grants a license to copy, modify, or redistribute them.',
    ],
  },
  {
    number: '05',
    title: 'Limitation of liability',
    body: [
      'Solace is provided as-is, without warranties of any kind. To the fullest extent permitted by law, Solace is not liable for any loss or damage arising from use of the service.',
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="brief-paper relative min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/10 bg-[rgba(247,242,232,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            <Mark size={20} />
            Solace
          </Link>
          <Link
            href="/"
            className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            Home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 pb-24 pt-36 md:px-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#7c7468]">
          Solace Terms of Service
        </p>
        <h1 className="mt-5 max-w-2xl font-serif text-5xl font-medium leading-tight text-[#13110c] md:text-7xl">
          The terms, kept short and honest.
        </h1>
        <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#6b6354]">
          Effective June 2026 · Limited beta · No performance claims
        </p>

        <div className="mt-10 border-t border-black/10 pt-8 text-base leading-8 text-[#3f3a30]">
          <p>
            These terms govern your access to and use of Solace, Hermes, and related products. They
            are deliberately brief. They will be reviewed and expanded by counsel as Solace matures;
            for now, clarity matters more than length.
          </p>
        </div>

        <div className="mt-16 space-y-14">
          {sections.map((section) => (
            <section
              key={section.number}
              id={`section-${section.number}`}
              className="border-t border-black/10 pt-8"
            >
              <div className="grid gap-5 md:grid-cols-[6rem_1fr]">
                <p className="font-mono text-xs text-[#7c7468]">{section.number}</p>
                <div>
                  <h2 className="font-serif text-3xl font-medium text-[#13110c] md:text-4xl">
                    {section.title}
                  </h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-[#3f3a30]">
                    {section.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}

          <section id="section-06" className="border-t border-black/10 pt-8">
            <div className="grid gap-5 md:grid-cols-[6rem_1fr]">
              <p className="font-mono text-xs text-[#7c7468]">06</p>
              <div>
                <h2 className="font-serif text-3xl font-medium text-[#13110c] md:text-4xl">
                  Contact
                </h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-[#3f3a30]">
                  <p>
                    Questions about these terms can be sent to{' '}
                    <a href="mailto:legal@solace.fyi" className="brief-author-link">
                      legal@solace.fyi
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-20 flex flex-col gap-3 border-t border-black/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#6b6354]">
            © 2026 Solace · Terms of Service
          </p>
          <Link
            href="/privacy"
            className="font-mono text-xs uppercase tracking-[0.18em] text-[#6b6354] transition-colors hover:text-[#13110c]"
          >
            Privacy policy
          </Link>
        </div>
      </article>
    </main>
  );
}
