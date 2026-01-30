"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "../bo.module.css";
import { apiBase, adminHeaders, readJson } from "../_lib/api";

type MemberRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: "PENDING_PAYMENT" | "ACTIVE" | "INACTIVE";
  current_number: number | null;

  isento: boolean;
  paid_through: string | null;
  paid_through_label: string; // "Dezembro 2026" | "Sem registo" | "—"
  quota_status: "ISENTO" | "EM_DIA" | "POR_REGULARIZAR";

  legacy_balance_cents: number;
};

function euros(cents: number) {
  return `${((Number(cents || 0) / 100).toFixed(2))}€`;
}

function pillStyle(status: MemberRow["quota_status"]) {
  // usa as pills que já tens (pillGreen/pillRed), sem inventar cores novas
  if (status === "EM_DIA") return `${styles.pill} ${styles.pillGreen}`;
  if (status === "POR_REGULARIZAR") return `${styles.pill} ${styles.pillRed}`;
  return styles.pill; // ISENTO (neutro)
}

export default function BoQuotasClient() {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [q, setQ] = useState("");
  const [memberStatus, setMemberStatus] = useState<string>(""); // "", ACTIVE, INACTIVE, PENDING_PAYMENT
  const [quotaFilter, setQuotaFilter] = useState<string>(""); // "", EM_DIA, POR_REGULARIZAR, ISENTO
  const debounceRef = useRef<number | null>(null);

  async function load(nextQ: string, nextStatus: string) {
    setLoading(true);
    const url = new URL(`${apiBase()}/admin/members`);

    if (nextStatus) url.searchParams.set("status", nextStatus);
    if (nextQ.trim()) url.searchParams.set("q", nextQ.trim());

    const res = await fetch(url.toString(), {
      headers: adminHeaders(),
      cache: "no-store",
    });

    const data = await readJson<MemberRow[] | { error?: string }>(res);
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filtros live (debounce)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => load(q, memberStatus), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, memberStatus]);

  // filtro quota (client-side)
  const filtered = useMemo(() => {
    if (!quotaFilter) return rows;
    return rows.filter((r) => r.quota_status === quotaFilter);
  }, [rows, quotaFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const emDia = filtered.filter((r) => r.quota_status === "EM_DIA").length;
    const emFalta = filtered.filter((r) => r.quota_status === "POR_REGULARIZAR").length;
    const isentos = filtered.filter((r) => r.quota_status === "ISENTO").length;
    return { total, emDia, emFalta, isentos };
  }, [filtered]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quotas</h1>
          <div className={styles.pageSubtitle}>
            Visão global por sócio. Filtra “em falta” para ver quem regularizar.
          </div>
        </div>

        <button className={styles.btnGhost} onClick={() => load(q, memberStatus)} disabled={loading}>
          Recarregar
        </button>
      </div>

      <div className={styles.controlsRow} style={{ marginTop: 0 }}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          {loading ? "A carregar..." : `Total: ${kpis.total}`}
        </span>
        <span className={`${styles.badge} ${styles.badgeGreen ?? ""}`}>
          <span className={styles.badgeDot} />
          Em dia: <strong>{kpis.emDia}</strong>
        </span>
        <span className={`${styles.badge} ${styles.badgeRed ?? ""}`}>
          <span className={styles.badgeDot} />
          Em falta: <strong>{kpis.emFalta}</strong>
        </span>
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          Isentos: <strong>{kpis.isentos}</strong>
        </span>
      </div>

      <div className={styles.controlsRow}>
        <input
          className={styles.input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar por nome ou email..."
        />

        <select className={styles.select} value={memberStatus} onChange={(e) => setMemberStatus(e.target.value)}>
          <option value="">Todos os estados</option>
          <option value="ACTIVE">Sócios ativos</option>
          <option value="PENDING_PAYMENT">Pendentes</option>
          <option value="INACTIVE">Inativos</option>
        </select>

        <select className={styles.select} value={quotaFilter} onChange={(e) => setQuotaFilter(e.target.value)}>
          <option value="">Todas as quotas</option>
          <option value="EM_DIA">Em dia</option>
          <option value="POR_REGULARIZAR">Em falta</option>
          <option value="ISENTO">Isento</option>
        </select>

        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          Resultados: <strong>{filtered.length}</strong>
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Sócio</th>
              <th>Quota</th>
              <th>Pago até</th>
              <th>Dívida anterior</th>
              <th>Email</th>
              <th>Telefone</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>{m.current_number ?? "—"}</td>

                <td>
                  <Link className={styles.rowLink} href={`/bo/socios/${m.id}`}>
                    {m.full_name}
                  </Link>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {m.status}
                  </div>
                </td>

                <td>
                  <span className={pillStyle(m.quota_status)}>
                    {m.quota_status === "EM_DIA" ? "Em dia" : m.quota_status === "POR_REGULARIZAR" ? "Em falta" : "Isento"}
                  </span>
                </td>

                <td>{m.quota_status === "ISENTO" ? "Isento" : (m.paid_through_label || "Sem registo")}</td>

                <td>{m.legacy_balance_cents ? euros(m.legacy_balance_cents) : "—"}</td>

                <td>{m.email || "—"}</td>
                <td>{m.phone || "—"}</td>
              </tr>
            ))}

            {!filtered.length && (
              <tr>
                <td colSpan={7} style={{ padding: 14, color: "var(--muted)" }}>
                  Sem resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
        Dica: clica no nome para abrir a ficha e lançar quotas / corrigir histórico.
      </div>
    </div>
  );
}
