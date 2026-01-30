import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./bo.module.css";

export default function BoLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.boShell}>
      <div className={styles.boTopbar}>
        <div className={styles.boBrand}>
          <div className={styles.boBrandTitle}>Mocidade Invicta</div>
          <div className={styles.boBrandSub}>Backoffice</div>
        </div>

        <nav className={styles.boNav}>
          <Link className={styles.boNavLink} href="/bo">Dashboard</Link>
          <Link className={styles.boNavLink} href="/bo/candidaturas">Candidaturas</Link>
          <Link className={styles.boNavLink} href="/bo/socios">Sócios</Link>
          <Link className={styles.boNavLink} href="/bo/quotas">Quotas</Link>
          <Link className={styles.boNavLink} href="/bo/isentos">Isentos</Link>
        </nav>
      </div>

      <main className={styles.boMain}>{children}</main>
    </div>
  );
}
