import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import headoutLogo from '../assets/logo/headout.svg';
import styles from './AppShell.module.css';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive} t-cta-sm` : `${styles.navLink} t-cta-sm`;

export function AppShell() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Move focus to the main region on navigation so screen-reader and keyboard
  // users land on the new page's content rather than the top of the document.
  useEffect(() => {
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <img className={styles.logo} src={headoutLogo} alt="Headout" />
            <span className={`${styles.brandLabel} t-heading-sm`}>Ad factory</span>
          </div>
          <nav className={styles.nav} aria-label="Primary">
            <NavLink to="/" end className={navLinkClass}>
              New ad
            </NavLink>
            <NavLink to="/history" className={navLinkClass}>
              History
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
