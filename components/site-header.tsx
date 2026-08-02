'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import Mark from '@/app/Mark';
import ThemeToggle from '@/app/ThemeToggle';

type SiteHeaderVariant = 'editorial' | 'product';

const navItems = [
  { label: 'Research', href: '/research' },
  { label: 'Brief', href: '/brief' },
  { label: 'Observatory', href: '/observatory' },
  { label: 'Hermes', href: '/hermes' },
  { label: 'Gates', href: '/gates' },
] as const;

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

function HeaderLink({
  href,
  label,
  variant,
  active,
  onClick,
}: {
  href: string;
  label: string;
  variant: SiteHeaderVariant;
  active?: boolean;
  onClick?: () => void;
}) {
  const isExternal = href.startsWith('http');
  const baseClasses =
    'font-mono text-[0.7rem] font-medium uppercase tracking-[0.12em] transition-colors duration-200';
  const colorClasses =
    variant === 'editorial'
      ? `text-muted hover:text-foreground ${active ? 'text-foreground font-semibold' : ''}`
      : `text-white/60 hover:text-white ${active ? 'text-white font-semibold' : ''}`;

  if (isExternal) {
    return (
      <a href={href} className={`${baseClasses} ${colorClasses}`} onClick={onClick} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={`${baseClasses} ${colorClasses}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      {label}
    </Link>
  );
}

export default function SiteHeader({ variant = 'editorial' }: { variant?: SiteHeaderVariant }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isEditorial = variant === 'editorial';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl ${
        isEditorial
          ? 'border-[var(--line)] bg-[var(--background)]/86'
          : 'border-white/[0.06] bg-[#040405]/70'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Link
          href="/"
          className={`inline-flex items-center gap-2 text-lg font-medium tracking-[-0.025em] transition-colors ${
            isEditorial ? 'text-foreground' : 'text-white'
          }`}
          aria-label="Solace home"
        >
          <Mark size={18} className={isEditorial ? 'text-foreground' : 'text-white'} />
          Solace
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <HeaderLink
              key={item.href}
              href={item.href}
              label={item.label}
              variant={variant}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            className={`inline-flex h-9 w-9 flex-col items-center justify-center gap-[0.23rem] md:hidden ${
              isEditorial ? 'text-foreground' : 'text-white'
            }`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span
              className={`block h-px w-[1.05rem] transition-transform duration-200 ${
                isEditorial ? 'bg-current' : 'bg-white'
              } ${menuOpen ? 'translate-y-[0.46rem] rotate-45' : ''}`}
            />
            <span
              className={`block h-px w-[1.05rem] transition-opacity duration-200 ${
                isEditorial ? 'bg-current' : 'bg-white'
              } ${menuOpen ? 'opacity-0' : ''}`}
            />
            <span
              className={`block h-px w-[1.05rem] transition-transform duration-200 ${
                isEditorial ? 'bg-current' : 'bg-white'
              } ${menuOpen ? '-translate-y-[0.46rem] -rotate-45' : ''}`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: easeOut }}
            className={`overflow-hidden border-t md:hidden ${
              isEditorial
                ? 'border-[var(--line)] bg-[var(--background)]'
                : 'border-white/[0.06] bg-[#040405]/95'
            }`}
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6">
              {navItems.map((item) => (
                <HeaderLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  variant={variant}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  onClick={() => setMenuOpen(false)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
