"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ApiOk = { ok: true; id: string; status: string };
type ApiErr = { error: string };

function safeErrorMessage(x: unknown) {
  if (!x || typeof x !== "object") return null;
  const anyX = x as any;
  return typeof anyX.error === "string" ? anyX.error : null;
}

export default function InscricaoPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !!fullName.trim() && !!birthDate && !!email.trim() && !!phone.trim() && consent && !loading;
  }, [fullName, birthDate, email, phone, consent, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOkMsg(null);
    setErrMsg(null);

    if (!apiBase) {
      setErrMsg("Falta configurar NEXT_PUBLIC_API_BASE no .env.local");
      return;
    }

    if (!canSubmit) {
      setErrMsg("Verifica os campos obrigatórios e o consentimento.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/applications`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          birth_date: birthDate || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Partial<ApiOk & ApiErr>;

      if (!res.ok) {
        const msg = safeErrorMessage(data) || "Erro ao enviar inscrição";
        throw new Error(msg);
      }

      setOkMsg("Inscrição enviada! Agora fica a aguardar confirmação de pagamento pela direção.");
      setFullName("");
      setBirthDate("");
      setEmail("");
      setPhone("");
      setNotes("");
      setConsent(false);
    } catch (e: any) {
      setErrMsg(e?.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header>
        <div className="container">
          <nav className="nav">
            <div className="logo-block">
              <img src="/logo.png" alt="Mocidade Invicta Futebol Clube" className="logo-img" />
              <div className="logo-area">
                <span className="logo-title">Mocidade Invicta</span>
                <span className="logo-sub">Inscrição de sócios</span>
              </div>
            </div>

            <div className="nav-links">
              <Link href="/" className="btn-outline">
                Voltar
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section>
          <div className="container">
            <h1 className="section-title">Quero tornar-me sócio</h1>
            <p className="section-subtitle">
              Preenche os dados seguintes. Depois de enviares, a direção valida o pagamento e atribui o teu número de sócio.
            </p>

            <div className="shell">
              {okMsg && <div className="alert success">{okMsg}</div>}
              {errMsg && <div className="alert error">{errMsg}</div>}
              {!okMsg && !errMsg && (
                <div className="alert info">
                  Dica: se já fores sócio e só quiseres atualizar dados, podes indicar isso nas observações.
                </div>
              )}

              <form onSubmit={onSubmit}>
                <div className="form-full">
                  <label>
                    Nome completo <span className="required">*</span>
                  </label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" required />
                </div>

                <div>
                  <label>
                    Data de nascimento <span className="required">*</span>
                  </label>
                  <input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} type="date" required />
                </div>

                <div>
                  <label>
                    Telemóvel <span className="required">*</span>
                  </label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required />
                </div>

                <div className="form-full">
                  <label>
                    E-mail <span className="required">*</span>
                  </label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                </div>

                <div className="form-full">
                  <label>Observações</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="form-full">
                  <div className="inline-group">
                    <label>
                      <input checked={consent} onChange={(e) => setConsent(e.target.checked)} type="checkbox" required />
                      Autorizo o tratamento dos meus dados para efeitos de gestão de sócio do clube.
                      <span className="required">*</span>
                    </label>
                  </div>
                </div>

                <div className="form-footer">
                  <div className="form-note">
                    <strong>RGPD:</strong> Os dados serão usados apenas para gestão da inscrição e relação de sócio com o clube.
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setOkMsg(null);
                        setErrMsg(null);
                        setFullName("");
                        setBirthDate("");
                        setEmail("");
                        setPhone("");
                        setNotes("");
                        setConsent(false);
                      }}
                      disabled={loading}
                    >
                      Limpar
                    </button>

                    <button className="primary-btn" type="submit" disabled={!canSubmit}>
                      {loading ? "A enviar..." : "Enviar inscrição"} <span>→</span>
                    </button>
                  </div>
                </div>

                {!apiBase && (
                  <div className="form-full" style={{ marginTop: "0.9rem" }}>
                    <div className="alert error">
                      NEXT_PUBLIC_API_BASE não está definido. Cria/edita o .env.local na raiz do projeto.
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer>
        Mocidade Invicta Futebol Clube · Porto · &copy; {new Date().getFullYear()}
      </footer>
    </>
  );
}
