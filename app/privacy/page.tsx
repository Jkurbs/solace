import type { Metadata } from 'next';
import Link from 'next/link';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Solace · Privacy Policy',
  description:
    'What Solace collects, how it is used, and what it is never used for. Solace does not sell personal information. June 2026.',
};

const sections = [
  {
    number: '01',
    title: 'Information collected',
    body: [
      'Solace may collect information you submit through request forms, account registration, and product usage. In practice this means your name, your email, and the responses you provide in an access request.',
    ],
  },
  {
    number: '02',
    title: 'How information is used',
    body: [
      'Information is used to evaluate access requests, to operate and improve Solace products, and to communicate with you about your access and the service.',
    ],
  },
  {
    number: '03',
    title: 'Data sharing',
    body: [
      'Solace does not sell personal information. Information may be shared with service providers strictly to operate the service (for example, identity verification and payment processing), and as required by law.',
    ],
  },
  {
    number: '04',
    title: 'Data retention',
    body: [
      'Information is kept only as long as needed to operate the service and meet legal obligations. You may request deletion of your information by contacting Solace.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="brief-paper relative min-h-screen overflow-x-hidden pt-16">
      <SiteHeader variant="editorial" />

      <article className="mx-auto max-w-4xl px-5 pb-24 pt-12 md:px-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[var(--paper-muted)]">
          Solace Privacy Policy
        </p>
        <h1 className="mt-5 max-w-2xl font-serif text-5xl font-medium leading-tight text-[var(--paper-ink)] md:text-7xl">
          What we collect, and what we never do with it.
        </h1>
        <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--paper-muted)]">
          Effective June 2026 · Limited beta
        </p>

        <div className="mt-10 border-t border-[var(--paper-line)] pt-8 text-base leading-8 text-[var(--paper-body)]">
          <p>
            This policy describes what information Solace collects, how it is used, and how it is
            protected. It is deliberately brief, and will be reviewed and expanded by counsel as
            Solace matures.
          </p>
        </div>

        <div className="mt-16 space-y-14">
          {sections.map((section) => (
            <section
              key={section.number}
              id={`section-${section.number}`}
              className="border-t border-[var(--paper-line)] pt-8"
            >
              <div className="grid gap-5 md:grid-cols-[6rem_1fr]">
                <p className="font-mono text-xs text-[var(--paper-muted)]">{section.number}</p>
                <div>
                  <h2 className="font-serif text-3xl font-medium text-[var(--paper-ink)] md:text-4xl">
                    {section.title}
                  </h2>
                  <div className="mt-5 space-y-4 text-base leading-8 text-[var(--paper-body)]">
                    {section.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}

          <section id="section-05" className="border-t border-[var(--paper-line)] pt-8">
            <div className="grid gap-5 md:grid-cols-[6rem_1fr]">
              <p className="font-mono text-xs text-[var(--paper-muted)]">05</p>
              <div>
                <h2 className="font-serif text-3xl font-medium text-[var(--paper-ink)] md:text-4xl">
                  Contact
                </h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-[var(--paper-body)]">
                  <p>
                    Questions about privacy, or a request to access or delete your information, can
                    be sent to{' '}
                    <a href="mailto:privacy@solace.fyi" className="brief-author-link">
                      privacy@solace.fyi
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-20 flex flex-col gap-3 border-t border-[var(--paper-line)] pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--paper-muted)]">
            © 2026 Solace · Privacy Policy
          </p>
          <Link
            href="/terms"
            className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-ink)]"
          >
            Terms of service
          </Link>
        </div>
      </article>

      <SiteFooter variant="editorial" />
    </main>
  );
}
