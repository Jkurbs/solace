import type { Metadata } from 'next';
import Link from 'next/link';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Solace · Privacy Policy',
  description:
    'How Solace collects, uses, and protects information across its non-custodial web3 platform. Last updated September 12, 2026.',
};

const sections = [
  {
    number: '01',
    title: 'Information We Do Not Collect',
    body: [
      'Because Solace prioritizes user privacy and utilizes a non-custodial web3 architecture, we do not store, view, or retain your private cryptographic keys, passphrases, seed phrases, or raw credit/debit card financial credentials.',
    ],
  },
  {
    number: '02',
    title: 'Information We Collect',
    body: [
      'Public Blockchain Data: When you connect an independent non-custodial wallet (such as through the Privy framework), we log your public wallet address to map your account profile data, record transaction history within the Platform dashboard, and track simulated performance histories.',
      'Device and Usage Logs: We may automatically collect standard data transmitted by your web browser, including your Internet Protocol (IP) address, browser type, operating system, and timestamp data to assist with geographic blocking compliance, fraud preventative actions, and UI optimization.',
      'Communications Data: If you contact us directly via hello@solace.fyi, we retain your email address and any submitted text to process your support request.',
    ],
  },
  {
    number: '03',
    title: 'Third-Party Service Processors',
    body: [
      'Our Platform integrates external financial and identity infrastructure components, specifically the Stripe Crypto Onramp. When utilizing these gateways, Stripe collects user information directly, including identity verification data, personal KYC logs, and credit card parameters. This collection is governed exclusively by Stripe\'s individual Privacy Policy and compliance guidelines.',
    ],
  },
  {
    number: '04',
    title: 'How We Use Information',
    body: [
      'We utilize collected logs to operate, maintain, and secure the Platform frontend tracking interfaces.',
      'We validate and enforce geographic geofencing restrictions to comply with regulatory limitations.',
      'We debug, optimize, and enhance the responsiveness of the backend execution handlers.',
    ],
  },
  {
    number: '05',
    title: 'Information Security',
    body: [
      'We apply industry-standard technical controls to safeguard data routed through our servers. However, because no transmission method over the internet is completely infallible, we cannot guarantee absolute security over information sent to us electronically.',
    ],
  },
  {
    number: '06',
    title: 'Updates to This Policy',
    body: [
      'We reserve the right to revise this Privacy Policy at any time. Any changes will be indicated on this page by modifying the "Last Updated" timestamp at the top of the section.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="brief-paper relative min-h-screen overflow-x-hidden pt-16">
      <SiteHeader />

      <article className="mx-auto max-w-4xl px-5 pb-24 pt-12 md:px-8">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[var(--paper-muted)]">
          Solace Privacy Policy
        </p>
        <h1 className="mt-5 max-w-2xl font-serif text-5xl font-medium leading-tight text-[var(--paper-ink)] md:text-7xl">
          What we collect, what we never store, and how we protect it.
        </h1>
        <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--paper-muted)]">
          Last updated September 12, 2026 · Non-custodial
        </p>

        <div className="mt-10 border-t border-[var(--paper-line)] pt-8 text-base leading-8 text-[var(--paper-body)]">
          <p>
            Solace ("we", "our", or "us") operates the website located at solace.fyi (the
            "Platform"). This Privacy Policy describes how we collect, utilize, and protect
            information when you interact with our software utilities, data analytical views, and
            non-custodial infrastructure interfaces.
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

          <section id="section-07" className="border-t border-[var(--paper-line)] pt-8">
            <div className="grid gap-5 md:grid-cols-[6rem_1fr]">
              <p className="font-mono text-xs text-[var(--paper-muted)]">07</p>
              <div>
                <h2 className="font-serif text-3xl font-medium text-[var(--paper-ink)] md:text-4xl">
                  Contact Us
                </h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-[var(--paper-body)]">
                  <p>
                    If you have questions regarding these privacy parameters, please notify us at{' '}
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

      <SiteFooter />
    </main>
  );
}