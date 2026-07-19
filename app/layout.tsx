import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://solace.fyi"),
  title: "Solace — Instruments for capital under uncertainty",
  description:
    'Independent research observatory. Hermes decides when capital should move, wait, or stand down — and seals every decision before the outcome is known.',
  openGraph: {
    siteName: "Solace",
    type: "website",
    title: "Solace — Instruments for capital under uncertainty",
    description:
      'Independent research observatory. Hermes decides when capital should move, wait, or stand down — and seals every decision before the outcome is known.',
  },
  // Without twitter:card, X renders pasted links without the large image.
  twitter: {
    card: "summary_large_image",
    site: "@solacefyi",
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Solace',
  url: 'https://solace.fyi',
  logo: 'https://solace.fyi/icon.svg',
  description:
    'Independent research company building instruments for decision-making under uncertainty, beginning in markets.',
  founder: {
    '@type': 'Person',
    name: 'Kerby Jean',
    url: 'https://solace.fyi/brief#author',
  },
  foundingDate: '2026',
  sameAs: ['https://x.com/solacefyi', 'https://github.com/Jkurbs'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'hello@solace.fyi',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {/* Theme boot before first paint: no flash of the wrong mode. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('solace-theme')==='light'){document.documentElement.dataset.theme='light'}}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
