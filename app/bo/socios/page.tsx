"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../bo.module.css";
import { apiBase, adminHeaders, readJson, type Member } from "../_lib/api";

type StatusFilter = "" | "ACTIVE" | "INACTIVE" | "PENDING_PAYMENT";
type NumberFilter = "" | "WITH_NUMBER" | "WITHOUT_NUMBER";

function statusOrder(s: string) {
  if (s === "PENDING_PAYMENT") return 0;
  if (s === "ACTIVE") return 1;
  if (s === "INACTIVE") return 2;
  return 9;
}

function safeDateMs(iso?: string | null) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function statusLabelPT(s: string) {
  if (s === "PENDING_PAYMENT") return "Pendente";
  if (s === "ACTIVE") return "Ativo";
  if (s === "INACTIVE") return "Inativo";
  return s;
}

export default function BoSocios() {
  const router = useRouter();

  const [rows, setRows] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [numFilter, setNumFilter] = useState<NumberFilter>("");
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<number | null>(null);

  async function load(nextQ: string, nextStatus: StatusFilter, nextNum: NumberFilter) {
    setLoading(true);

    try {
      const url = new URL(`${apiBase()}/admin/members`);

      // Se o backend suportar estes params, ótimo.
      // Se não suportar, continuamos a filtrar localmente abaixo.
      if (nextStatus) url.searchParams.set("status", nextStatus);
      if (nextQ.trim()) url.searchParams.set("q", nextQ.trim());

      const res = await fetch(url.toString(), { headers: adminHeaders(), cache: "no-store" });
      const data = await readJson<Member[] | { error?: string }>(res);

      const list = Array.isArray(data) ? data : [];

      // Ordenação “operacional”
      const sorted = [...list].sort((a, b) => {
        const ao = statusOrder((a as any).status);
        const bo = statusOrder((b as any).status);
        if (ao !== bo) return ao - bo;

        // Mais recentes primeiro (created_at)
        const at = safeDateMs((a as any).created_at);
        const bt = safeDateMs((b as any).created_at);
        return bt - at;
      });

      setRows(sorted);
    } finally {
      setLoading(false);
    }
  }

  // Load inicial
  useEffect(() => {
    load("", "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live filters (debounce)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => load(q, status, numFilter), 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, numFilter]);

  // Filtro local (caso API não suporte o "com nº / sem nº")
  const filteredRows = useMemo(() => {
    if (!numFilter) return rows;

    if (numFilter === "WITH_NUMBER") {
      return rows.filter((m: any) => m.current_number != null);
    }

    return rows.filter((m: any) => m.current_number == null);
  }, [rows, numFilter]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Sócios</h1>
          <div className={styles.pageSubtitle}>
            Pesquisa por nome/email. Clica no nome (ou na linha) para abrir a ficha.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className={`${styles.badge} ${loading ? styles.badgeBlue : ""}`}>
            <span className={styles.badgeDot} />
            {loading ? "A carregar..." : `Resultados: ${filteredRows.length}`}
          </span>

          <button
            className={styles.btnGhost}
            type="button"
            onClick={() => load(q, status, numFilter)}
            disabled={loading}
            title="Recarregar"
          >
            Recarregar
          </button>
        </div>
      </div>

      <div className={styles.controlsRow}>
        <input
          className={styles.input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar por nome ou email..."
        />

        <select
          className={styles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="">Todos os estados</option>
          <option value="PENDING_PAYMENT">Pendentes</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
        </select>

        <select
          className={styles.select}
          value={numFilter}
          onChange={(e) => setNumFilter(e.target.value as NumberFilter)}
        >
          <option value="">Todos (com/sem nº)</option>
          <option value="WITH_NUMBER">Com nº</option>
          <option value="WITHOUT_NUMBER">Sem nº</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Nº</th>
              <th>Nome</th>
              <th style={{ width: 160 }}>Estado</th>
              <th style={{ width: 160 }}>Quota</th>
              <th>Email</th>
              <th style={{ width: 160 }}>Telefone</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((m: any) => {
              const statusVal = String(m.status || "");
              const quotaVal = m.quota_status ?? m.dues_status ?? null;

              const statusClass =
                statusVal === "ACTIVE"
                  ? styles.pillGreen
                  : statusVal === "PENDING_PAYMENT"
                    ? styles.pillRed
                    : styles.pill;

              return (
                <tr
                  key={m.id}
                  className={styles.trClickable}
                  onClick={() => router.push(`/bo/socios/${m.id}`)}
                >
                  <td>{m.current_number ?? "—"}</td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <Link className={styles.rowLink} href={`/bo/socios/${m.id}`}>
                      {m.full_name}
                    </Link>
                  </td>

                  <td>
                    <span className={`${styles.pill} ${statusClass}`}>
                      {statusLabelPT(statusVal)}
                    </span>
                  </td>

                  <td>
                    {quotaVal ? (
                      <span className={styles.pill}>{String(quotaVal)}</span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>

                  <td>{m.email || "—"}</td>
                  <td>{m.phone || "—"}</td>
                </tr>
              );
            })}

            {!filteredRows.length && (
              <tr>
                <td colSpan={6} style={{ padding: 14, color: "var(--muted)" }}>
                  Sem resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
