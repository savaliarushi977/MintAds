import { NavLink, Outlet } from 'react-router-dom';
import headoutLogo from '../assets/logo/headout.svg';
import styles from './AppShell.module.css';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive} t-cta-sm` : `${styles.navLink} t-cta-sm`;

export function AppShell() {
  return (
    <div className={styles.shell}>
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
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
