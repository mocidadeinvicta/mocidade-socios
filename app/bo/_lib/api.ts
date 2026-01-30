export type Member = {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    status: "PENDING_PAYMENT" | "ACTIVE" | "INACTIVE";
    current_number: number | null;
  
    isento?: boolean;
    paid_through?: string | null;
    paid_through_label?: string;
    quota_status?: "ISENTO" | "EM_DIA" | "POR_REGULARIZAR";
    legacy_balance_cents?: number;
  
    birth_date?: string | null;
    created_at: string;
    joined_at: string | null; // <-- IMPORTANT: pode ser null
    notes?: string | null;
  };
  
  export function apiBase() {
    // fallback útil para dev local
    const fallback = "http://127.0.0.1:8787";
  
    const base = (process.env.NEXT_PUBLIC_API_BASE || fallback).trim();
    const cleaned = base.replace(/\/$/, "");
  
    if (!cleaned) {
      // erro explícito (não deixa “Failed to fetch” misterioso)
      throw new Error(
        "NEXT_PUBLIC_API_BASE está vazio. Define no .env.local (ex: http://127.0.0.1:8787) e reinicia o dev server."
      );
    }
  
    return cleaned;
  }
  
  export function adminHeaders() {
    const token = (process.env.NEXT_PUBLIC_ADMIN_TOKEN || "").trim();
  
    return {
      "content-type": "application/json",
      authorization: token ? `Bearer ${token}` : "",
    };
  }
  
  export async function readJson<T>(res: Response): Promise<T> {
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  }
  