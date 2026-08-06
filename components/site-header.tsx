'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import Mark from '@/app/Mark';
import ThemeToggle from '@/app/ThemeToggle';

/** Paper (Observatory) is the site standard. Ink is only for rare full-bleed dark heroes. */
export type SiteHeaderVariant = 'paper' | 'ink';

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
  active,
  onClick,
  mobile = false,
  variant = 'paper',
}: {
  href: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  mobile?: boolean;
  variant?: SiteHeaderVariant;
}) {
  const isExternal = href.startsWith('http');
  const muted = variant === 'ink' ? 'text-white/56' : 'text-[var(--muted)]';
  const hover = variant === 'ink' ? 'hover:text-white' : 'hover:text-[var(--foreground)]';
  const ink = variant === 'ink' ? 'bg-white' : 'bg-[var(--foreground)]';

  const classes = mobile
    ? `group relative py-2 font-mono text-sm font-medium uppercase tracking-[0.14em] ${muted} transition-colors ${hover}`
    : `group relative py-1 font-mono text-[0.7rem] font-medium uppercase tracking-[0.12em] ${muted} transition-colors duration-200 ${hover}`;

  const indicator = (
    <span
      className={`absolute left-1/2 -translate-x-1/2 rounded-full ${ink} transition-all duration-200 ${
        mobile
          ? 'top-0 h-px w-0 group-hover:w-4'
          : '-bottom-1 h-[2px] w-[2px] group-hover:w-1.5 group-hover:opacity-100'
      } ${active ? (mobile ? 'w-4 opacity-100' : 'w-1.5 opacity-100') : 'opacity-0'}`}
      aria-hidden="true"
    />
  );

  if (isExternal) {
    return (
      <a
        href={href}
        className={classes}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
        {indicator}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={classes}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      {label}
      {indicator}
    </Link>
  );
}

export default function SiteHeader({ variant = 'paper' }: { variant?: SiteHeaderVariant }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isInk = variant === 'ink';
  const bg = isInk
    ? 'bg-[#0a0a0a]/80'
    : 'bg-[var(--background)]/88';
  const text = isInk ? 'text-white' : 'text-[var(--foreground)]';
  const border = scrolled
    ? isInk
      ? 'border-white/10 shadow-[0_1px_24px_rgba(0,0,0,0.35)]'
      : 'border-[var(--border)] shadow-[0_1px_20px_rgba(28,25,23,0.04)]'
    : 'border-transparent';
  const menuBg = isInk
    ? 'bg-[#0a0a0a] border-white/10'
    : 'bg-[var(--background)] border-[var(--border)]';

  return (
    <header
      className={`site-header fixed inset-x-0 top-0 z-40 border-b ${bg} backdrop-blur-xl transition-[background-color,border-color,color,box-shadow] duration-300 ${border} ${text}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 md:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-lg font-medium tracking-[-0.025em] transition-opacity hover:opacity-70"
          aria-label="Solace home"
        >
          <Mark size={18} className="transition-transform duration-500 group-hover:rotate-45" />
          <span>Solace</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <HeaderLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              variant={variant}
            />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle variant={variant} />
          <button
            type="button"
            className="inline-flex h-9 w-9 flex-col items-center justify-center gap-[0.23rem] md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span
              className={`block h-px w-[1.05rem] bg-current transition-transform duration-200 ${
                menuOpen ? 'translate-y-[0.46rem] rotate-45' : ''
              }`}
            />
            <span
              className={`block h-px w-[1.05rem] bg-current transition-opacity duration-200 ${
                menuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-px w-[1.05rem] bg-current transition-transform duration-200 ${
                menuOpen ? '-translate-y-[0.46rem] -rotate-45' : ''
              }`}
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
            className={`overflow-hidden border-t ${menuBg} md:hidden`}
          >
            <div className="mx-auto flex max-w-6xl flex-col px-5 py-8">
              {navItems.map((item) => (
                <HeaderLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  onClick={() => setMenuOpen(false)}
                  mobile
                  variant={variant}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
