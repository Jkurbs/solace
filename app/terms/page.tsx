import type { Metadata } from 'next';
import Link from 'next/link';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Solace · Terms of Service',
  description:
    'Terms governing access to Solace, Hermes, and Oracle. Non-custodial software, third-party gateways, eligibility restrictions, and limitation of liability. Last updated September 12, 2026.',
};

const sections = [
  {
    number: '01',
    title: 'Acceptance of Terms',
    body: [
      `By accessing or using the Platform, you agree to be bound by these Terms and our Privacy Policy. If you are registering or using the Platform as an individual sole proprietor or on behalf of an entity, you represent that you have the legal authority to bind yourself or that entity to these conditions. If you do not agree, you must immediately cease using the Platform.`,
    ],
  },
  {
    number: '02',
    title: 'Description of Services',
    body: [
      `Solace functions strictly as a software development, research, and data analytics provider. The Platform designs and publishes non-custodial software tools, analytics interfaces, and algorithmic tracking parameters (including the "Hermes" and "Oracle" modules). The Platform provides both simulated performance tracking profiles ("Demo Mode") and interfaces allowing users to connect independent, non-custodial cryptographic wallets.`,
    ],
  },
  {
    number: '03',
    title: 'Non-Custodial Nature of Software',
    body: [
      `You explicitly acknowledge and agree that Solace is a non-custodial software application. Solace does not hold, store, manage, safeguard, or maintain custody or control over your digital assets, private cryptographic keys, or fiat currency reserves. Any digital asset transactions initiated through the Platform are executed directly by you via third-party web3 wallet management solutions (such as Privy) and independent public blockchain protocols.`,
    ],
  },
  {
    number: '04',
    title: 'Third-Party Integrations and Gateways',
    body: [
      `The Platform utilizes independent, third-party service providers to facilitate ecosystem actions, including Stripe, Inc. for fiat-to-crypto gateway access ("Stripe Crypto Onramp"). Your utilization of any third-party payment infrastructure is governed strictly by the respective provider's terms, conditions, and compliance frameworks. Solace is not liable for transaction declines, service interruptions, or regulatory account limitations imposed by third-party processors.`,
    ],
  },
  {
    number: '05',
    title: 'Eligibility and Geographic Restrictions',
    body: [
      `You represent and warrant that you are at least 18 years of age and possess the legal capacity to enter into a binding agreement. You further certify that you are not a resident or citizen of, or located within, any jurisdiction embargoed by the United States or subject to international sanctions.`,
      `Pursuant to financial service restrictions, residents of high-risk jurisdictions and specific domestic states, including the State of Hawaii and the State of New York, are explicitly prohibited from utilizing the Platform's live transaction mechanisms or integrated fiat-to-crypto systems.`,
    ],
  },
  {
    number: '06',
    title: 'No Financial or Investment Advice',
    body: [
      `All information, metrics, tracking profiles, and quantitative models displayed on Solace are provided strictly for educational, informational, and software testing purposes. Solace does not offer investment advice, financial planning services, portfolio management, or legal counsel. The historical performance of any simulated strategy or algorithmic parameter does not guarantee or imply future results.`,
    ],
  },
  {
    number: '07',
    title: 'Limitation of Liability',
    body: [
      `TO THE MAXIMUM EXTENT PERMITTED BY LAW, SOLACE AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DIGITAL ASSETS, PRIVATE KEYS, OR DATA, WHETHER INCURRED DIRECTLY OR INDIRECTLY, RESULTING FROM (I) YOUR ACCESS TO OR USE OF THE PLATFORM; (II) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE; OR (III) THE PERFORMANCE, VULNERABILITY, OR EXPLOIT OF ANY DEPLOYED SMART CONTRACTS.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="brief-paper relative min-h-screen overflow-x-hidden pt-16">
      <SiteHeader />

      <article className="mx-auto max-w-4xl px-5 pb-24 pt-12 md:px-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[var(--paper-muted)]">
          Solace Terms of Service
        </p>
        <h1 className="mt-5 max-w-2xl font-serif text-5xl font-medium leading-tight text-[var(--paper-ink)] md:text-7xl">
          The terms, kept short and honest.
        </h1>
        <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--paper-muted)]">
          Last updated September 12, 2026 · Non-custodial · No performance claims
        </p>

        <div className="mt-10 border-t border-[var(--paper-line)] pt-8 text-base leading-8 text-[var(--paper-body)]">
          <p>
            Welcome to Solace (the "Platform"), accessible via solace.fyi. Please read these Terms
            of Service ("Terms") carefully before using our website, services, or any associated
            software interfaces.
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

          <section id="section-08" className="border-t border-[var(--paper-line)] pt-8">
            <div className="grid gap-5 md:grid-cols-[6rem_1fr]">
              <p className="font-mono text-xs text-[var(--paper-muted)]">08</p>
              <div>
                <h2 className="font-serif text-3xl font-medium text-[var(--paper-ink)] md:text-4xl">
                  Contact Information
                </h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-[var(--paper-body)]">
                  <p>
                    For support, compliance inquiries, or legal notifications, please contact the
                    Platform administration team via email at{' '}
                    <a href="mailto:hello@solace.fyi" className="brief-author-link">
                      hello@solace.fyi
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
            © 2026 Solace · Terms of Service
          </p>
          <Link
            href="/privacy"
            className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-ink)]"
          >
            Privacy policy
          </Link>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}