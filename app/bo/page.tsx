import Link from "next/link";
import styles from "./bo.module.css";

export default function BackofficeDashboard() {
  // Por agora ainda está hardcoded; depois ligamos ao /admin/members e calculamos counts.
  const total = 3;
  const emDia = 3;
  const emFalta = 0;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <div className={styles.pageSubtitle}>
            Gestão de sócios, candidaturas e quotas
          </div>
        </div>
        <button className={styles.btnPrimary}>Atualizar</button>
      </div>

      <div className={styles.controlsRow} style={{ marginTop: 0 }}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          Total: <strong>{total}</strong>
        </span>
        <span className={`${styles.badge} ${styles.badgeGreen}`}>
          <span className={styles.badgeDot} />
          Em dia: <strong>{emDia}</strong>
        </span>
        <span className={`${styles.badge} ${styles.badgeRed}`}>
          <span className={styles.badgeDot} />
          Em falta: <strong>{emFalta}</strong>
        </span>
      </div>

      <section className={styles.grid}>
        <Link href="/bo/candidaturas" className={`${styles.card} ${styles.cardPriority}`}>

          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>Candidaturas</h3>
            <span className={`${styles.pill} ${styles.pillRed}`}>Prioridade</span>
          </div>

          <div className={styles.value}>1</div>
          <p className={styles.desc}>Pendentes de pagamento</p>

          <div className={styles.cardCtaRow}>
            <span className={styles.btnGhost}>Abrir fila</span>
          </div>
        </Link>

        <Link href="/bo/socios" className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>Sócios ativos</h3>
            <span className={`${styles.pill} ${styles.pillGreen}`}>Ativos</span>
          </div>

          <div className={styles.value}>2</div>
          <p className={styles.desc}>Lista geral e pesquisa</p>

          <div className={styles.cardCtaRow}>
            <span className={styles.btnGhost}>Abrir lista</span>
          </div>
        </Link>

        <Link href="/bo/quotas" className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>Quotas em falta</h3>
            <span className={styles.pill}>Verificar</span>
          </div>

          <div className={styles.value}>0</div>
          <p className={styles.desc}>Por regularizar</p>

          <div className={styles.cardCtaRow}>
            <span className={styles.btnGhost}>Ver detalhes</span>
          </div>
        </Link>

        <Link href="/bo/isentos" className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>Isentos</h3>
            <span className={styles.pill}>Isento</span>
          </div>

          <div className={styles.value}>2</div>
          <p className={styles.desc}>Até 12 anos</p>

          <div className={styles.cardCtaRow}>
            <span className={styles.btnGhost}>Abrir lista</span>
          </div>
        </Link>
      </section>

      <div style={{ marginTop: 16 }} className={styles.tableWrap}>
        <div style={{ padding: 14 }}>
          <strong>Fluxo recomendado:</strong>{" "}
          Candidaturas -- confirmar pagamento -- atribuir n° -- registar quotas.
        </div>
      </div>
    </div>
  );
}
