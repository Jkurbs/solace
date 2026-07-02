import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://solace.fyi"),
  title: "Solace — Independent Research Company",
  description:
    "Solace is an independent research company building intelligent systems that observe, model, and act in complex environments.",
  openGraph: {
    siteName: "Solace",
    type: "website",
    title: "Solace — Independent Research Company",
    description:
      "Solace is an independent research company building intelligent systems that observe, model, and act in complex environments.",
  },
  // Without twitter:card, X renders pasted links without the large image.
  twitter: {
    card: "summary_large_image",
    site: "@solacefyi",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
