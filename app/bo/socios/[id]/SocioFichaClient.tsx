"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../../bo.module.css";
import { apiBase, adminHeaders, readJson, type Member as ApiMember } from "../../_lib/api";

type MemberStatus = "PENDING_PAYMENT" | "ACTIVE" | "INACTIVE";

/**
 * O teu type Member do api pode não declarar alguns campos (ex: created_at),
 * mas eles existem na resposta. Então criamos um "MemberFull" compatível.
 */
type MemberFull = ApiMember & {
  id: string;
  full_name: string;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: MemberStatus;
  current_number: number | null;
  created_at: string; // <- importante para não dar erro TS
  joined_at: string | null;
};

type PatchBody = {
  full_name: string;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: MemberStatus;
};

type DuesPeriod = {
  id: string;
  member_id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  amount_cents: number;
  method: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  created_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  notes: string | null;
};

type DuesMonthlyBody = {
  months: number; // 1..36
  amount_cents?: number; // por mês (default 200)
  method?: string;
  notes?: string;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
};

type DuesPatchBody = {
  period_start?: string;
  period_end?: string;
  amount_cents?: number;
  method?: string | null;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
  notes?: string | null;
};

function euros(cents: number) {
  const v = (Number(cents || 0) / 100).toFixed(2);
  return `${v}€`;
}

function centsFromEuroInput(input: string) {
  const norm = (input || "").replace(",", ".").trim();
  if (!norm) return 0;
  const n = Number(norm);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

function euroInputFromCents(cents: number) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function monthNamePT(month1to12: number) {
  const m = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];
  return m[month1to12 - 1] || "";
}

function formatMonthLabelFromISO(iso: string) {
  const y = iso.slice(0, 4);
  const m = Number(iso.slice(5, 7));
  return `${monthNamePT(m)} ${y}`;
}

function normalizeMember(m: MemberFull): PatchBody {
  return {
    full_name: (m.full_name || "").trim(),
    birth_date: m.birth_date ?? null,
    email: (m.email || "").trim() || null,
    phone: (m.phone || "").trim() || null,
    notes: m.notes ?? null,
    status: m.status,
  };
}

function startOfMonthISO(year: number, month1to12: number) {
  return new Date(Date.UTC(year, month1to12 - 1, 1)).toISOString().slice(0, 10);
}

function endOfMonthISO(year: number, month1to12: number) {
  const d = new Date(Date.UTC(year, month1to12, 0));
  return d.toISOString().slice(0, 10);
}

function ageAtDate(birthISO: string, atISO: string) {
  const b = new Date(birthISO + "T00:00:00Z");
  const at = new Date(atISO + "T00:00:00Z");
  let age = at.getUTCFullYear() - b.getUTCFullYear();
  const m = at.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

function isExemptUnder12(birthISO: string | null, monthEndISO: string) {
  if (!birthISO) return false;
  return ageAtDate(birthISO, monthEndISO) < 12;
}

function overlapsMonth(r: DuesPeriod, monthStart: string, monthEnd: string) {
  return r.period_start <= monthEnd && r.period_end >= monthStart;
}

export default function SocioFichaClient({ id }: { id: string }) {
  // ----------------- MEMBER -----------------
  const [m, setM] = useState<MemberFull | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<PatchBody | null>(null);

  const disabled = !editing || loading || saving;

  async function loadMember() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch(`${apiBase()}/admin/members/${id}`, {
        headers: adminHeaders(),
        cache: "no-store",
      });

      const data = await readJson<MemberFull | { error: string }>(res);
      if (!res.ok) throw new Error((data as any)?.error || "Erro a carregar");

      const member = data as MemberFull;
      setM(member);

      setEditing(false);
      setSnapshot(normalizeMember(member));
    } catch (e: any) {
      setErr(e?.message || "Erro");
      setM(null);
      setEditing(false);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canSave = useMemo(() => {
    if (!m || !snapshot) return false;
    if (!editing) return false;
    const now = normalizeMember(m);
    return JSON.stringify(now) !== JSON.stringify(snapshot);
  }, [m, snapshot, editing]);

  function startEditing() {
    if (!m) return;
    setSnapshot(normalizeMember(m));
    setEditing(true);
    setMsg(null);
    setErr(null);
  }

  function cancelEditing() {
    if (!m || !snapshot) {
      setEditing(false);
      return;
    }
    setM((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        full_name: snapshot.full_name,
        birth_date: snapshot.birth_date,
        email: snapshot.email,
        phone: snapshot.phone,
        notes: snapshot.notes,
        status: snapshot.status,
      };
    });
    setEditing(false);
    setMsg(null);
    setErr(null);
  }

  async function ensureNumberIfActivated(prev: MemberStatus, next: MemberStatus) {
    // Se o backend não atribui nº via PATCH, garantimos via endpoint /activate
    if (!m) return;
    if (prev === "PENDING_PAYMENT" && next === "ACTIVE" && !m.current_number) {
      const res = await fetch(`${apiBase()}/admin/members/${id}/activate`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({}),
      });
      const data = await readJson<{ number?: number; error?: string }>(res);
      if (!res.ok) throw new Error((data as any)?.error || "Erro a atribuir nº de sócio");
    }
  }

  async function saveMember() {
    if (!m) return;

    setSaving(true);
    setMsg(null);
    setErr(null);

    const prevStatus = snapshot?.status ?? m.status;

    try {
      const payload: PatchBody = normalizeMember(m);

      const res = await fetch(`${apiBase()}/admin/members/${id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJson<{ ok: true } | { error: string }>(res);
      if (!res.ok) throw new Error((data as any)?.error || "Erro a guardar");

      // 👇 garante nº de sócio quando passa a ACTIVE
      await ensureNumberIfActivated(prevStatus, payload.status);

      setMsg("Guardado com sucesso.");
      await loadMember();
    } catch (e: any) {
      setErr(e?.message || "Erro a guardar");
    } finally {
      setSaving(false);
    }
  }

  // ----------------- DUES -----------------
  const [duesRows, setDuesRows] = useState<DuesPeriod[]>([]);
  const [duesLoading, setDuesLoading] = useState(false);
  const [duesErr, setDuesErr] = useState<string | null>(null);

  const [monthsToAdd, setMonthsToAdd] = useState<1 | 3 | 6 | 12>(1);
  const [monthsMethod, setMonthsMethod] = useState<string>("MBWAY");
  const [monthsNotes, setMonthsNotes] = useState<string>("");

  const [yearView, setYearView] = useState<number>(new Date().getUTCFullYear());
  const [selectedYM, setSelectedYM] = useState<string>(""); // "YYYY-MM" ou ""

  const [editDuesId, setEditDuesId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    period_start: string;
    period_end: string;
    amount_eur: string; // euros no UI
    method: string;
    status: DuesPeriod["status"];
    notes: string;
  } | null>(null);

  async function loadDues() {
    setDuesLoading(true);
    setDuesErr(null);
    try {
      const res = await fetch(`${apiBase()}/admin/members/${id}/dues`, {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const data = await readJson<DuesPeriod[] | { error?: string }>(res);
      if (!res.ok) throw new Error((data as any)?.error || "Erro a carregar quotas");
      setDuesRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setDuesErr(e?.message || "Erro");
      setDuesRows([]);
    } finally {
      setDuesLoading(false);
    }
  }

  useEffect(() => {
    loadDues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addMonthly(months: number) {
    setDuesLoading(true);
    setDuesErr(null);
    try {
      const payload: DuesMonthlyBody = {
        months,
        amount_cents: 200, // 2€ / mês (pode mudar no futuro)
        method: monthsMethod || "MBWAY",
        notes: monthsNotes?.trim() || undefined,
        status: "CONFIRMED",
      };

      const res = await fetch(`${apiBase()}/admin/members/${id}/dues/monthly`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error((data as any)?.error || "Erro a lançar quotas");

      setMonthsNotes("");
      await loadDues();
    } catch (e: any) {
      setDuesErr(e?.message || "Erro a lançar quotas");
    } finally {
      setDuesLoading(false);
    }
  }

  function openEditRow(r: DuesPeriod) {
    setEditDuesId(r.id);
    setEditForm({
      period_start: r.period_start,
      period_end: r.period_end,
      amount_eur: euroInputFromCents(r.amount_cents), // ✅ euros
      method: r.method || "",
      status: r.status,
      notes: r.notes || "",
    });
  }

  function closeEditRow() {
    setEditDuesId(null);
    setEditForm(null);
  }

  async function saveDuesRow() {
    if (!editDuesId || !editForm) return;

    setDuesLoading(true);
    setDuesErr(null);

    try {
      const payload: DuesPatchBody = {
        period_start: editForm.period_start,
        period_end: editForm.period_end,
        amount_cents: centsFromEuroInput(editForm.amount_eur), // ✅ converte para cêntimos no backend
        method: editForm.method?.trim() ? editForm.method.trim() : null,
        status: editForm.status,
        notes: editForm.notes?.trim() ? editForm.notes.trim() : null,
      };

      const res = await fetch(`${apiBase()}/admin/dues/${editDuesId}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error((data as any)?.error || "Erro a guardar alteração");

      closeEditRow();
      await loadDues();
    } catch (e: any) {
      setDuesErr(e?.message || "Erro");
    } finally {
      setDuesLoading(false);
    }
  }

  async function cancelDuesRow(duesId: string) {
    if (!confirm("Cancelar este registo? (fica no histórico como CANCELLED)")) return;

    setDuesLoading(true);
    setDuesErr(null);
    try {
      const res = await fetch(`${apiBase()}/admin/dues/${duesId}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status: "CANCELLED" } satisfies DuesPatchBody),
      });

      const data = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error((data as any)?.error || "Erro a cancelar");

      await loadDues();
    } catch (e: any) {
      setDuesErr(e?.message || "Erro");
    } finally {
      setDuesLoading(false);
    }
  }

  async function deleteDuesRow(duesId: string) {
    if (!confirm("Apagar este registo? (irreversível)")) return;

    setDuesLoading(true);
    setDuesErr(null);
    try {
      const res = await fetch(`${apiBase()}/admin/dues/${duesId}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });

      const data = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error((data as any)?.error || "Erro a apagar");

      await loadDues();
    } catch (e: any) {
      setDuesErr(e?.message || "Erro");
    } finally {
      setDuesLoading(false);
    }
  }

  const confirmedRows = useMemo(
    () => duesRows.filter((r) => r.status === "CONFIRMED"),
    [duesRows]
  );

  const duesSummary = useMemo(() => {
    const totalConfirmed = confirmedRows.reduce((a, r) => a + Number(r.amount_cents || 0), 0);
    const paidThrough = confirmedRows.length ? confirmedRows[0].period_end : null;
    return { count: duesRows.length, totalConfirmed, paidThrough };
  }, [duesRows, confirmedRows]);

  const yearOptions = useMemo(() => {
    const ys = new Set<number>();
    const nowY = new Date().getUTCFullYear();
    ys.add(nowY);
    ys.add(nowY - 1);
    for (const r of duesRows) {
      const y1 = Number(r.period_end.slice(0, 4));
      const y2 = Number(r.period_start.slice(0, 4));
      if (!Number.isNaN(y1)) ys.add(y1);
      if (!Number.isNaN(y2)) ys.add(y2);
    }
    return Array.from(ys).sort((a, b) => b - a);
  }, [duesRows]);

  const monthGrid = useMemo(() => {
    const out: Array<{
      ym: string;
      label: string;
      monthStart: string;
      monthEnd: string;
      status: "EM_DIA" | "EM_FALTA" | "ISENTO";
    }> = [];

    const birth = m?.birth_date ?? null;

    for (let month = 1; month <= 12; month++) {
      const ym = `${yearView}-${String(month).padStart(2, "0")}`;
      const monthStart = startOfMonthISO(yearView, month);
      const monthEnd = endOfMonthISO(yearView, month);

      const exempt = isExemptUnder12(birth, monthEnd);
      if (exempt) {
        out.push({ ym, label: monthNamePT(month).slice(0, 3), monthStart, monthEnd, status: "ISENTO" });
        continue;
      }

      const paid = confirmedRows.some((r) => overlapsMonth(r, monthStart, monthEnd));
      out.push({ ym, label: monthNamePT(month).slice(0, 3), monthStart, monthEnd, status: paid ? "EM_DIA" : "EM_FALTA" });
    }

    return out;
  }, [yearView, confirmedRows, m?.birth_date]);

  const filteredTableRows = useMemo(() => {
    if (!selectedYM) return duesRows;

    const y = Number(selectedYM.slice(0, 4));
    const mo = Number(selectedYM.slice(5, 7));
    const ms = startOfMonthISO(y, mo);
    const me = endOfMonthISO(y, mo);

    return duesRows.filter((r) => overlapsMonth(r, ms, me));
  }, [duesRows, selectedYM]);

  const statusLabel = (s: "EM_DIA" | "EM_FALTA" | "ISENTO") =>
    s === "EM_DIA" ? "Em dia" : s === "EM_FALTA" ? "Em falta" : "Isento";

  return (
    <div>
      {/* HEADER */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ficha do sócio</h1>
          <div className={styles.pageSubtitle}>
            <Link className={styles.rowLink} href="/bo/socios">← Voltar à lista</Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className={styles.btnGhost} onClick={loadMember} disabled={loading || saving}>
            Recarregar
          </button>

          {!editing ? (
            <button className={styles.btnPrimary} onClick={startEditing} disabled={!m || loading}>
              Editar
            </button>
          ) : (
            <>
              <button className={styles.btnGhost} onClick={cancelEditing} disabled={saving}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} onClick={saveMember} disabled={!canSave || saving}>
                {saving ? "A guardar..." : "Guardar alterações"}
              </button>
            </>
          )}
        </div>
      </div>

      {loading && <div className={styles.tableWrap} style={{ padding: 14 }}>A carregar...</div>}
      {err && <div className={styles.tableWrap} style={{ padding: 14 }}><strong>Erro:</strong> {err}</div>}
      {msg && !err && <div className={styles.tableWrap} style={{ padding: 14 }}>{msg}</div>}

      {m && (
        <>
          {/* DADOS */}
          <div className={styles.tableWrap} style={{ padding: 16 }}>
            <div className={styles.controlsRow} style={{ marginTop: 0 }}>
              <span className={styles.badge}><span className={styles.badgeDot} /> Nº: <strong>{m.current_number ?? "—"}</strong></span>
              <span className={styles.badge}><span className={styles.badgeDot} /> Estado: <strong>{m.status}</strong></span>
              <span className={styles.badge}><span className={styles.badgeDot} /> Criado: <strong>{new Date(m.created_at).toLocaleString()}</strong></span>
              {m.joined_at && (
                <span className={styles.badge}><span className={styles.badgeDot} /> Ativado: <strong>{new Date(m.joined_at).toLocaleString()}</strong></span>
              )}

              <span className={styles.badge} style={{ marginLeft: "auto" }}>
                <span className={styles.badgeDot} /> {editing ? "Edição desbloqueada" : "Protegido"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 8 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                  Nome completo
                </div>
                <input
                  className={styles.input}
                  style={{ borderRadius: 14, minWidth: "100%" }}
                  value={m.full_name}
                  disabled={disabled}
                  onChange={(e) => setM({ ...m, full_name: e.target.value })}
                />
              </div>

              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                  Data nascimento
                </div>
                <input
                  className={styles.input}
                  style={{ borderRadius: 14, minWidth: "100%" }}
                  type="date"
                  value={m.birth_date ?? ""}
                  disabled={disabled}
                  onChange={(e) => setM({ ...m, birth_date: e.target.value || null })}
                />
              </div>

              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                  Estado
                </div>
                <select
                  className={styles.select}
                  style={{ borderRadius: 14, minWidth: "100%" }}
                  value={m.status}
                  disabled={disabled}
                  onChange={(e) => setM({ ...m, status: e.target.value as MemberStatus })}
                >
                  <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                  Email
                </div>
                <input
                  className={styles.input}
                  style={{ borderRadius: 14, minWidth: "100%" }}
                  value={m.email ?? ""}
                  disabled={disabled}
                  onChange={(e) => setM({ ...m, email: e.target.value || null })}
                />
              </div>

              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                  Telefone
                </div>
                <input
                  className={styles.input}
                  style={{ borderRadius: 14, minWidth: "100%" }}
                  value={m.phone ?? ""}
                  disabled={disabled}
                  onChange={(e) => setM({ ...m, phone: e.target.value || null })}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                  Notas
                </div>
                <textarea
                  className={styles.input}
                  style={{ borderRadius: 14, minWidth: "100%", minHeight: 120, resize: "vertical" }}
                  value={m.notes ?? ""}
                  disabled={disabled}
                  onChange={(e) => setM({ ...m, notes: e.target.value || null })}
                />
              </div>
            </div>
          </div>

          {/* QUOTAS */}
          <div className={styles.tableWrap} style={{ padding: 16, marginTop: 14 }}>
            <div className={styles.controlsRow} style={{ marginTop: 0, justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: 900, letterSpacing: "-0.01em" }}>Quotas</span>

                <span className={styles.badge}>
                  <span className={styles.badgeDot} />
                  {duesLoading ? "A carregar..." : `Registos: ${duesSummary.count}`}
                </span>

                <span className={styles.badge}>
                  <span className={styles.badgeDot} />
                  Total confirmado: <strong>{euros(duesSummary.totalConfirmed)}</strong>
                </span>

                {duesSummary.paidThrough && (
                  <span className={styles.badge}>
                    <span className={styles.badgeDot} />
                    Pago até: <strong>{formatMonthLabelFromISO(duesSummary.paidThrough)}</strong>
                  </span>
                )}

                {selectedYM && (
                  <span className={styles.badge}>
                    <span className={styles.badgeDot} />
                    Filtro: <strong>{selectedYM}</strong>
                    <button
                      className={styles.btnGhost}
                      style={{ padding: "6px 10px", marginLeft: 8 }}
                      onClick={() => setSelectedYM("")}
                      disabled={duesLoading}
                      type="button"
                    >
                      Limpar
                    </button>
                  </span>
                )}
              </div>

              <button className={styles.btnGhost} onClick={loadDues} disabled={duesLoading} type="button">
                Recarregar
              </button>
            </div>

            <div className={styles.controlsRow} style={{ marginTop: 10 }}>
              <select
                className={styles.select}
                value={yearView}
                onChange={(e) => {
                  setYearView(Number(e.target.value));
                  setSelectedYM("");
                }}
              >
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>

              <span className={styles.badge}>
                <span className={styles.badgeDot} />
                Clica num mês para filtrar o histórico.
              </span>
            </div>

            {/* ✅ Grelha corrigida: consistente, sem hacks, sem estilos inline */}
            <div className={styles.monthGrid}>
              {monthGrid.map((cell) => {
                const active = selectedYM === cell.ym;

                return (
                  <button
                    key={cell.ym}
                    onClick={() => setSelectedYM(active ? "" : cell.ym)}
                    disabled={duesLoading}
                    className={`${styles.monthCell} ${active ? styles.monthCellActive : ""}`}
                    title={`${cell.ym} -- ${statusLabel(cell.status)}`}
                    type="button"
                  >
                    <span className={styles.monthLabel}>{cell.label}</span>

                    <span
                      className={[
                        styles.monthStatus,
                        cell.status === "EM_DIA" ? styles.monthStatusOk : "",
                        cell.status === "EM_FALTA" ? styles.monthStatusBad : "",
                        cell.status === "ISENTO" ? styles.monthStatusNeutral : "",
                      ].join(" ")}
                    >
                      <span className={styles.monthDot} />
                      {statusLabel(cell.status)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={styles.controlsRow} style={{ marginTop: 14 }}>
              <select
                className={styles.select}
                value={monthsToAdd}
                onChange={(e) => setMonthsToAdd(Number(e.target.value) as any)}
              >
                <option value={1}>1 mês</option>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </select>

              <select
                className={styles.select}
                value={monthsMethod}
                onChange={(e) => setMonthsMethod(e.target.value)}
              >
                <option value="MBWAY">MB Way</option>
                <option value="TRANSFER">Transferência</option>
                <option value="CASH">Numerário</option>
                <option value="OTHER">Outro</option>
                <option value="PARDON">Perdão direção</option>
              </select>

              <input
                className={styles.input}
                value={monthsNotes}
                onChange={(e) => setMonthsNotes(e.target.value)}
                placeholder="Notas (opcional) -- ex: pago em numerário / perdão aprovado em ata..."
              />

              <button className={styles.btnPrimary} onClick={() => addMonthly(monthsToAdd)} disabled={duesLoading} type="button">
                Lançar
              </button>
            </div>

            {duesErr && (
              <div style={{ marginTop: 10, padding: 12, border: "1px solid var(--border)", borderRadius: 14 }}>
                <strong>Erro:</strong> {duesErr}
              </div>
            )}

            <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Valor</th>
                    <th>Método</th>
                    <th>Status</th>
                    <th>Notas</th>
                    <th style={{ width: 1 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{formatMonthLabelFromISO(r.period_end)}</strong>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{r.period_start} → {r.period_end}</div>
                      </td>
                      <td>{euros(r.amount_cents)}</td>
                      <td>{r.method || "—"}</td>
                      <td>{r.status}</td>
                      <td style={{ maxWidth: 420 }}>
                        <span style={{ color: r.notes ? "var(--text)" : "var(--muted)" }}>{r.notes || "—"}</span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className={styles.btnGhost} onClick={() => openEditRow(r)} disabled={duesLoading} type="button">Editar</button>{" "}
                        <button className={styles.btnGhost} onClick={() => cancelDuesRow(r.id)} disabled={duesLoading || r.status === "CANCELLED"} type="button">Cancelar</button>{" "}
                        <button className={styles.btnGhost} onClick={() => deleteDuesRow(r.id)} disabled={duesLoading} type="button">Apagar</button>
                      </td>
                    </tr>
                  ))}

                  {!filteredTableRows.length && !duesLoading && (
                    <tr>
                      <td colSpan={6} style={{ padding: 14, color: "var(--muted)" }}>
                        Sem registos para este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MODAL EDIT */}
            {editDuesId && editForm && (
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  zIndex: 50,
                }}
                onMouseDown={(e) => { if (e.target === e.currentTarget) closeEditRow(); }}
              >
                <div
                  style={{
                    width: "min(720px, 100%)",
                    background: "white",
                    borderRadius: 18,
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow)",
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>Editar quota</div>
                      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                        Valor em euros. Datas em YYYY-MM-DD.
                      </div>
                    </div>
                    <button className={styles.btnGhost} onClick={closeEditRow} disabled={duesLoading} type="button">
                      Fechar
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                        Início
                      </div>
                      <input
                        className={styles.input}
                        type="date"
                        value={editForm.period_start}
                        onChange={(e) => setEditForm({ ...editForm, period_start: e.target.value })}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                        Fim
                      </div>
                      <input
                        className={styles.input}
                        type="date"
                        value={editForm.period_end}
                        onChange={(e) => setEditForm({ ...editForm, period_end: e.target.value })}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                        Valor (€)
                      </div>
                      <input
                        className={styles.input}
                        inputMode="decimal"
                        value={editForm.amount_eur}
                        onChange={(e) => setEditForm({ ...editForm, amount_eur: e.target.value })}
                        placeholder="ex: 4.00"
                      />
                      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                        Vai guardar: <strong>{euros(centsFromEuroInput(editForm.amount_eur))}</strong>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                        Status
                      </div>
                      <select
                        className={styles.select}
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      >
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PENDING">PENDING</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                        Método
                      </div>
                      <input
                        className={styles.input}
                        value={editForm.method}
                        onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}
                        placeholder="MBWAY / TRANSFER / CASH / PARDON..."
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800, marginBottom: 6 }}>
                        Notas
                      </div>
                      <textarea
                        className={styles.input}
                        style={{ minHeight: 110, borderRadius: 14, resize: "vertical" }}
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
                    <button className={styles.btnGhost} onClick={closeEditRow} disabled={duesLoading} type="button">Cancelar</button>
                    <button className={styles.btnPrimary} onClick={saveDuesRow} disabled={duesLoading} type="button">Guardar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
