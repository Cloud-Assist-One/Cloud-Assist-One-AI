'use client';

import { useState } from 'react';
import styles from './Header.module.css';

const NAV_LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#contact', label: 'Contact' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <a className={styles.logo} href="#top">
        <img src="/cao_ai_logo.png" alt="Cloud Assist One logo" width={117} height={128} />
      </a>

      <nav className={styles.nav} aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>

      <a className={styles.cta} href="#contact">
        Get Started
      </a>

      <button
        type="button"
        className={styles.menuToggle}
        aria-label="Menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {menuOpen && (
        <nav className={styles.mobileNav} aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href="#contact" onClick={() => setMenuOpen(false)}>
            Get Started
          </a>
        </nav>
      )}
    </header>
  );
}
