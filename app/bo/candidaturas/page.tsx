"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "../bo.module.css";
import { apiBase, adminHeaders, readJson, type Member } from "../_lib/api";

export default function BoCandidaturas() {
  const [rows, setRows] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  async function load(nextQ: string) {
    setLoading(true);
    const url = new URL(`${apiBase()}/admin/members`);
    url.searchParams.set("status", "PENDING_PAYMENT");
    if (nextQ.trim()) url.searchParams.set("q", nextQ.trim());

    const res = await fetch(url.toString(), { headers: adminHeaders() });
    const data = await readJson<Member[] | { error?: string }>(res);

    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(""); }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => load(q), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const count = useMemo(() => rows.length, [rows]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Candidaturas</h1>
          <div className={styles.pageSubtitle}>
            Pendentes de pagamento (confirmar e ativar)
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={() => load(q)}>
          Atualizar
        </button>
      </div>

      <div className={styles.controlsRow}>
        <input
          className={styles.input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar por nome ou email..."
        />
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          {loading ? "A carregar..." : `Resultados: ${count}`}
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link className={styles.rowLink} href={`/bo/socios/${m.id}`}>
                    {m.full_name}
                  </Link>
                </td>
                <td>{m.email || "—"}</td>
                <td>{m.phone || "—"}</td>
                <td>
                  <span className={`${styles.badge} ${styles.badgeRed}`}>
                    <span className={styles.badgeDot} />
                    Pendente
                  </span>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} style={{ padding: 14, color: "var(--muted)" }}>
                  Sem candidaturas para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
