type Env = {
	DB: D1Database;
	ADMIN_TOKEN: string;
  };
  
  type ApplicationBody = {
	full_name: string;
	birth_date?: string; // YYYY-MM-DD
	email?: string;
	phone?: string;
	notes?: string;
  };
  
  type DuesBody = {
	months: 1 | 3 | 6 | 12;
	amount_cents?: number; // default months*200
	method?: string; // CASH | MBWAY | TRANSFER | OTHER
	notes?: string;
  };
  
  type DuesMonthlyBody = {
	months: number; // 1..36 (vamos validar)
	amount_cents?: number; // default 200
	method?: string; // CASH | MBWAY | TRANSFER | OTHER | PARDON
	notes?: string;
	status?: "PENDING" | "CONFIRMED" | "CANCELLED"; // default CONFIRMED
  };
  
  type DuesPatchBody = {
	period_start?: string; // YYYY-MM-DD
	period_end?: string; // YYYY-MM-DD
	amount_cents?: number;
	method?: string | null;
	status?: "PENDING" | "CONFIRMED" | "CANCELLED";
	confirmed_at?: string | null;
	confirmed_by?: string | null;
	notes?: string | null;
  };
  
  function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
	  status,
	  headers: { "content-type": "application/json; charset=utf-8" },
	});
  }
  
  function cors(resp: Response) {
	const h = new Headers(resp.headers);
	h.set("access-control-allow-origin", "*");
	h.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
	h.set("access-control-allow-headers", "content-type,authorization");
	return new Response(resp.body, { status: resp.status, headers: h });
  }
  
  function requireAdmin(req: Request, env: Env) {
	const auth = req.headers.get("authorization") || "";
	if (auth !== `Bearer ${env.ADMIN_TOKEN}`) {
	  throw new Response("Unauthorized", { status: 401 });
	}
  }
  
  function monthNamePT(month1to12: number) {
	const m = [
	  "Janeiro",
	  "Fevereiro",
	  "Março",
	  "Abril",
	  "Maio",
	  "Junho",
	  "Julho",
	  "Agosto",
	  "Setembro",
	  "Outubro",
	  "Novembro",
	  "Dezembro",
	];
	return m[month1to12 - 1] || "";
  }
  
  function endOfMonthISO(year: number, month1to12: number) {
	// day 0 of next month = last day of requested month
	const d = new Date(Date.UTC(year, month1to12, 0));
	return d.toISOString().slice(0, 10);
  }
  
  function startOfMonthISO(year: number, month1to12: number) {
	return new Date(Date.UTC(year, month1to12 - 1, 1)).toISOString().slice(0, 10);
  }
  
  function addMonthsUTC(year: number, month1to12: number, add: number) {
	let y = year;
	let m = month1to12 + add;
	while (m > 12) {
	  m -= 12;
	  y += 1;
	}
	while (m < 1) {
	  m += 12;
	  y -= 1;
	}
	return { year: y, month: m };
  }
  
  function calcAge(birthISO: string | null, now = new Date()): number | null {
	if (!birthISO) return null;
	const birth = new Date(birthISO + "T00:00:00Z");
	const y = now.getUTCFullYear() - birth.getUTCFullYear();
	const m = now.getUTCMonth() - birth.getUTCMonth();
	let age = y;
	if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
	return age;
  }
  
  function parseMemberIdFromPath(pathname: string): string | null {
	// /admin/members/:id/activate OR /admin/members/:id/dues OR /admin/members/:id/dues/monthly
	const parts = pathname.split("/").filter(Boolean);
	if (parts.length < 4) return null;
	if (parts[0] !== "admin" || parts[1] !== "members") return null;
	return parts[2] || null;
  }
  
  function parseMemberIdFromAdminPath(pathname: string): { id: string | null; tail: string | null; tail2: string | null } {
	// /admin/members/:id  OR /admin/members/:id/activate OR /admin/members/:id/dues OR /admin/members/:id/dues/monthly
	const parts = pathname.split("/").filter(Boolean);
	if (parts.length < 3) return { id: null, tail: null, tail2: null };
	if (parts[0] !== "admin" || parts[1] !== "members") return { id: null, tail: null, tail2: null };
	return { id: parts[2] || null, tail: parts[3] || null, tail2: parts[4] || null };
  }
  
  function parseDuesIdFromPath(pathname: string): string | null {
	// /admin/dues/:duesId
	const parts = pathname.split("/").filter(Boolean);
	if (parts.length !== 3) return null;
	if (parts[0] !== "admin" || parts[1] !== "dues") return null;
	return parts[2] || null;
  }
  
  const DEFAULT_MONTHLY_CENTS = 200; // 2€ por mês (podes aumentar no futuro via request amount_cents)
  
  export default {
	async fetch(req: Request, env: Env): Promise<Response> {
	  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  
	  const url = new URL(req.url);
	  const path = url.pathname;
  
	  try {
		// --- HEALTH
		if (req.method === "GET" && path === "/health") {
		  return cors(json({ ok: true }));
		}
  
		// --- PUBLIC: application (new member candidate)
		if (req.method === "POST" && path === "/applications") {
		  const body = (await req.json()) as ApplicationBody;
  
		  if (!body.full_name || typeof body.full_name !== "string") {
			return cors(json({ error: "Nome obrigatório" }, 400));
		  }
  
		  const id = crypto.randomUUID();
		  const now = new Date().toISOString();
  
		  await env.DB.prepare(`
			INSERT INTO members (id, full_name, birth_date, email, phone, status, joined_at, legacy_balance_cents, notes, created_at)
			VALUES (?, ?, ?, ?, ?, 'PENDING_PAYMENT', NULL, 0, ?, ?)
		  `)
			.bind(
			  id,
			  body.full_name.trim(),
			  body.birth_date || null,
			  body.email || null,
			  body.phone || null,
			  body.notes || null,
			  now
			)
			.run();
  
		  return cors(json({ ok: true, id, status: "PENDING_PAYMENT" }, 201));
		}
  
		// --- ADMIN: list members (with isento + paid_through)
		if (req.method === "GET" && path === "/admin/members") {
		  requireAdmin(req, env);
  
		  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
		  const status = (url.searchParams.get("status") || "").trim(); // optional
  
		  let where = "1=1";
		  const binds: any[] = [];
  
		  if (status) {
			where += " AND m.status = ?";
			binds.push(status);
		  }
		  if (q) {
			where += " AND (lower(m.full_name) LIKE ? OR lower(m.email) LIKE ?)";
			binds.push(`%${q}%`, `%${q}%`);
		  }
  
		  const res = await env.DB.prepare(`
			SELECT
			  m.id, m.full_name, m.birth_date, m.email, m.phone, m.status, m.joined_at, m.legacy_balance_cents, m.created_at,
			  (SELECT number_value FROM member_numbers n WHERE n.member_id = m.id AND n.active = 1 LIMIT 1) AS current_number,
			  (SELECT MAX(dp.period_end) FROM dues_periods dp WHERE dp.member_id = m.id AND dp.status = 'CONFIRMED') AS paid_through
			FROM members m
			WHERE ${where}
			ORDER BY m.full_name ASC
			LIMIT 1000
		  `)
			.bind(...binds)
			.all();
  
		  const now = new Date();
		  const currentYear = now.getUTCFullYear();
		  const currentMonth = now.getUTCMonth() + 1;
		  const endCurrentMonth = endOfMonthISO(currentYear, currentMonth);
  
		  const rows = (res.results as any[]).map((r) => {
			const age = calcAge(r.birth_date ?? null, now);
			const isento = age !== null ? age <= 12 : false;
  
			const paidThrough: string | null = r.paid_through ?? null;
  
			let paidThroughLabel = "Sem registo";
			if (paidThrough) {
			  const d = new Date(paidThrough + "T00:00:00Z");
			  paidThroughLabel = `${monthNamePT(d.getUTCMonth() + 1)} ${d.getUTCFullYear()}`;
			}
  
			const emDia = isento ? true : paidThrough ? paidThrough >= endCurrentMonth : false;
  
			return {
			  id: r.id,
			  full_name: r.full_name,
			  email: r.email,
			  phone: r.phone,
			  status: r.status,
			  current_number: r.current_number ?? null,
  
			  isento,
			  paid_through: paidThrough,
			  paid_through_label: isento ? "—" : paidThroughLabel,
			  quota_status: isento ? "ISENTO" : emDia ? "EM_DIA" : "POR_REGULARIZAR",
  
			  legacy_balance_cents: r.legacy_balance_cents ?? 0,
			};
		  });
  
		  return cors(json(rows));
		}
  
		// --- ADMIN: get member by id (ficha)
		if (req.method === "GET" && /^\/admin\/members\/[^\/]+$/.test(path)) {
		  requireAdmin(req, env);
  
		  const id = path.split("/")[3];
		  if (!id) {
			return cors(json({ error: "ID inválido" }, 400));
		  }
  
		  const r = await env.DB.prepare(
			`
			SELECT
			  m.id,
			  m.full_name,
			  m.birth_date,
			  m.email,
			  m.phone,
			  m.notes,
			  m.status,
			  m.created_at,
			  m.joined_at,
			  (
				SELECT number_value
				FROM member_numbers n
				WHERE n.member_id = m.id AND n.active = 1
				LIMIT 1
			  ) AS current_number
			FROM members m
			WHERE m.id = ?
			LIMIT 1
		  `
		  )
			.bind(id)
			.first();
  
		  if (!r) {
			return cors(json({ error: "Sócio não encontrado" }, 404));
		  }
  
		  return cors(json(r));
		}
  
		// --- ADMIN: update member by id (editar ficha)
		if (
		  req.method === "PATCH" &&
		  path.startsWith("/admin/members/") &&
		  !path.endsWith("/activate") &&
		  !path.endsWith("/dues") &&
		  !path.includes("/dues/")
		) {
		  requireAdmin(req, env);
		  const { id: memberId, tail, tail2 } = parseMemberIdFromAdminPath(path);
		  if (!memberId || tail || tail2) return cors(json({ error: "Rota inválida" }, 400));
  
		  const body = (await req.json().catch(() => ({}))) as any;
  
		  const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
		  if (!full_name) return cors(json({ error: "full_name obrigatório" }, 400));
  
		  const birth_date = typeof body.birth_date === "string" && body.birth_date ? body.birth_date : null;
		  const email = typeof body.email === "string" && body.email ? body.email : null;
		  const phone = typeof body.phone === "string" && body.phone ? body.phone : null;
		  const notes = typeof body.notes === "string" && body.notes ? body.notes : null;
  
		  const status =
			body.status === "PENDING_PAYMENT" || body.status === "ACTIVE" || body.status === "INACTIVE"
			  ? body.status
			  : null;
  
		  if (!status) return cors(json({ error: "status inválido" }, 400));
  
		  await env.DB.prepare(`
			UPDATE members
			SET full_name = ?, birth_date = ?, email = ?, phone = ?, notes = ?, status = ?
			WHERE id = ?
		  `)
			.bind(full_name, birth_date, email, phone, notes, status, memberId)
			.run();
  
		  return cors(json({ ok: true }));
		}
  
		// --- ADMIN: activate member (confirm payment, assign number)
if (req.method === "POST" && path.startsWith("/admin/members/") && path.endsWith("/activate")) {
	requireAdmin(req, env);
	const memberId = parseMemberIdFromPath(path);
	if (!memberId) return cors(json({ error: "member id inválido" }, 400));
  
	// se já tiver número ativo, não volta a atribuir
	const existing = await env.DB.prepare(`
	  SELECT number_value
	  FROM member_numbers
	  WHERE member_id = ? AND active = 1
	  LIMIT 1
	`).bind(memberId).first() as any;
  
	if (existing?.number_value != null) {
	  // garantir que o membro está ACTIVE (idempotência)
	  await env.DB.prepare(`UPDATE members SET status='ACTIVE' WHERE id=?`).bind(memberId).run();
	  return cors(json({ ok: true, member_id: memberId, number: Number(existing.number_value) }));
	}
  
	const now = new Date().toISOString();
  
	const seqRow = await env.DB.prepare(
	  "SELECT next_value FROM number_sequences WHERE scheme = ?"
	).bind("CURRENT_2025").first() as any;
  
	if (!seqRow?.next_value) return cors(json({ error: "Sequência CURRENT_2025 não encontrada" }, 500));
	const nextNumber = Number(seqRow.next_value);
  
	await env.DB.batch([
	  env.DB.prepare("UPDATE members SET status='ACTIVE', joined_at=? WHERE id=?")
		.bind(now, memberId),
  
	  env.DB.prepare(`
		INSERT INTO member_numbers (id, member_id, scheme, number_value, active, assigned_at, assigned_by)
		VALUES (?, ?, 'CURRENT_2025', ?, 1, ?, ?)
	  `).bind(crypto.randomUUID(), memberId, nextNumber, now, "admin"),
  
	  env.DB.prepare("UPDATE number_sequences SET next_value = next_value + 1 WHERE scheme='CURRENT_2025'")
	]);
  
	return cors(json({ ok: true, member_id: memberId, number: nextNumber }));
  }
  
  
		// --- ADMIN: list dues history for a member
		if (req.method === "GET" && path.startsWith("/admin/members/") && path.endsWith("/dues")) {
		  requireAdmin(req, env);
		  const memberId = parseMemberIdFromPath(path);
		  if (!memberId) return cors(json({ error: "member id inválido" }, 400));
  
		  const res = await env.DB.prepare(
			`
			SELECT
			  id,
			  member_id,
			  period_start,
			  period_end,
			  amount_cents,
			  method,
			  status,
			  created_at,
			  confirmed_at,
			  confirmed_by,
			  notes
			FROM dues_periods
			WHERE member_id = ?
			ORDER BY period_end DESC, created_at DESC
			LIMIT 2000
		  `
		  )
			.bind(memberId)
			.all();
  
		  return cors(json(res.results ?? []));
		}
  
		// --- ADMIN: add dues period (1/3/6/12 months)  (mantida)
		if (req.method === "POST" && path.startsWith("/admin/members/") && path.endsWith("/dues")) {
		  requireAdmin(req, env);
		  const memberId = parseMemberIdFromPath(path);
		  if (!memberId) return cors(json({ error: "member id inválido" }, 400));
  
		  const body = (await req.json()) as DuesBody;
		  const months = Number(body.months);
  
		  if (![1, 3, 6, 12].includes(months)) {
			return cors(json({ error: "months inválido (1,3,6,12)" }, 400));
		  }
  
		  // find paid_through
		  const row = (await env.DB.prepare(`
			SELECT MAX(period_end) AS paid_through
			FROM dues_periods
			WHERE member_id=? AND status='CONFIRMED'
		  `)
			.bind(memberId)
			.first()) as any;
  
		  const paidThrough: string | null = row?.paid_through ?? null;
  
		  // Start date = 1st of next month after paidThrough, else current month (1st)
		  const now = new Date();
		  let startYear = now.getUTCFullYear();
		  let startMonth = now.getUTCMonth() + 1;
  
		  if (paidThrough) {
			const d = new Date(paidThrough + "T00:00:00Z");
			startYear = d.getUTCFullYear();
			startMonth = d.getUTCMonth() + 2;
			if (startMonth === 13) {
			  startMonth = 1;
			  startYear += 1;
			}
		  }
  
		  const startISO = startOfMonthISO(startYear, startMonth);
  
		  // End month = startMonth + months - 1
		  let endYear = startYear;
		  let endMonth = startMonth + months - 1;
		  while (endMonth > 12) {
			endMonth -= 12;
			endYear += 1;
		  }
  
		  const endISO = endOfMonthISO(endYear, endMonth);
  
		  const amount = body.amount_cents ?? months * DEFAULT_MONTHLY_CENTS;
		  const id = crypto.randomUUID();
		  const ts = new Date().toISOString();
  
		  await env.DB.prepare(`
			INSERT INTO dues_periods (id, member_id, period_start, period_end, amount_cents, method, status, created_at, confirmed_at, confirmed_by, notes)
			VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)
		  `)
			.bind(id, memberId, startISO, endISO, amount, body.method || null, ts, ts, "admin", body.notes || null)
			.run();
  
		  const label = `${monthNamePT(Number(endISO.slice(5, 7)))} ${endISO.slice(0, 4)}`;
  
		  return cors(
			json(
			  {
				ok: true,
				member_id: memberId,
				period_start: startISO,
				period_end: endISO,
				paid_through_label: label,
			  },
			  201
			)
		  );
		}
  
		// --- ADMIN: add MONTHLY dues (N meses, 1 registo por mês)
		if (req.method === "POST" && path.startsWith("/admin/members/") && path.endsWith("/dues/monthly")) {
		  requireAdmin(req, env);
		  const { id: memberId, tail, tail2 } = parseMemberIdFromAdminPath(path);
		  if (!memberId || tail !== "dues" || tail2 !== "monthly") return cors(json({ error: "Rota inválida" }, 400));
  
		  const body = (await req.json().catch(() => ({}))) as Partial<DuesMonthlyBody>;
		  const months = Number(body.months);
  
		  if (!Number.isFinite(months) || months < 1 || months > 36) {
			return cors(json({ error: "months inválido (1..36)" }, 400));
		  }
  
		  // paid_through (apenas CONFIRMED)
		  const row = (await env.DB.prepare(`
			SELECT MAX(period_end) AS paid_through
			FROM dues_periods
			WHERE member_id=? AND status='CONFIRMED'
		  `)
			.bind(memberId)
			.first()) as any;
  
		  const paidThrough: string | null = row?.paid_through ?? null;
  
		  // start month = next month after paidThrough, else current month
		  const now = new Date();
		  let startYear = now.getUTCFullYear();
		  let startMonth = now.getUTCMonth() + 1;
  
		  if (paidThrough) {
			const d = new Date(paidThrough + "T00:00:00Z");
			startYear = d.getUTCFullYear();
			startMonth = d.getUTCMonth() + 2;
			if (startMonth === 13) {
			  startMonth = 1;
			  startYear += 1;
			}
		  }
  
		  const amountCents = typeof body.amount_cents === "number" && Number.isFinite(body.amount_cents)
			? Math.max(0, Math.round(body.amount_cents))
			: DEFAULT_MONTHLY_CENTS;
  
		  const status = body.status ?? "CONFIRMED";
		  if (!["PENDING", "CONFIRMED", "CANCELLED"].includes(status)) {
			return cors(json({ error: "status inválido (PENDING|CONFIRMED|CANCELLED)" }, 400));
		  }
  
		  const ts = new Date().toISOString();
		  const confirmedAt = status === "CONFIRMED" ? ts : null;
		  const confirmedBy = status === "CONFIRMED" ? "admin" : null;
  
		  const stmts: D1PreparedStatement[] = [];
		  const createdIds: string[] = [];
  
		  for (let i = 0; i < months; i++) {
			const { year, month } = addMonthsUTC(startYear, startMonth, i);
			const period_start = startOfMonthISO(year, month);
			const period_end = endOfMonthISO(year, month);
  
			const id = crypto.randomUUID();
			createdIds.push(id);
  
			stmts.push(
			  env.DB.prepare(`
				INSERT INTO dues_periods
				  (id, member_id, period_start, period_end, amount_cents, method, status, created_at, confirmed_at, confirmed_by, notes)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			  `).bind(
				id,
				memberId,
				period_start,
				period_end,
				amountCents,
				body.method || null,
				status,
				ts,
				confirmedAt,
				confirmedBy,
				body.notes || null
			  )
			);
		  }
  
		  await env.DB.batch(stmts);
  
		  // devolve paid_through (se CONFIRMED)
		  const newPaidThroughRow = (await env.DB.prepare(`
			SELECT MAX(period_end) AS paid_through
			FROM dues_periods
			WHERE member_id=? AND status='CONFIRMED'
		  `)
			.bind(memberId)
			.first()) as any;
  
		  const newPaidThrough: string | null = newPaidThroughRow?.paid_through ?? null;
  
		  return cors(
			json(
			  {
				ok: true,
				member_id: memberId,
				created: createdIds.length,
				created_ids: createdIds,
				amount_cents: amountCents,
				status,
				paid_through: newPaidThrough,
			  },
			  201
			)
		  );
		}
  
		// --- ADMIN: PATCH a dues record (editar/cancelar)
		if (req.method === "PATCH" && /^\/admin\/dues\/[^\/]+$/.test(path)) {
		  requireAdmin(req, env);
		  const duesId = parseDuesIdFromPath(path);
		  if (!duesId) return cors(json({ error: "dues id inválido" }, 400));
  
		  const body = (await req.json().catch(() => ({}))) as DuesPatchBody;
  
		  // buscar atual para decidir defaults
		  const existing = (await env.DB.prepare(`
			SELECT id, status, confirmed_at, confirmed_by
			FROM dues_periods
			WHERE id = ?
			LIMIT 1
		  `).bind(duesId).first()) as any;
  
		  if (!existing) return cors(json({ error: "Registo não encontrado" }, 404));
  
		  const set: string[] = [];
		  const binds: any[] = [];
  
		  if (typeof body.period_start === "string") { set.push("period_start=?"); binds.push(body.period_start); }
		  if (typeof body.period_end === "string") { set.push("period_end=?"); binds.push(body.period_end); }
		  if (typeof body.amount_cents === "number" && Number.isFinite(body.amount_cents)) {
			set.push("amount_cents=?"); binds.push(Math.max(0, Math.round(body.amount_cents)));
		  }
		  if (body.method === null || typeof body.method === "string") { set.push("method=?"); binds.push(body.method); }
		  if (body.notes === null || typeof body.notes === "string") { set.push("notes=?"); binds.push(body.notes); }
  
		  if (body.status) {
			if (!["PENDING", "CONFIRMED", "CANCELLED"].includes(body.status)) {
			  return cors(json({ error: "status inválido (PENDING|CONFIRMED|CANCELLED)" }, 400));
			}
			set.push("status=?"); binds.push(body.status);
  
			// se passar a CONFIRMED e não vier confirmed_at, marcamos agora
			if (body.status === "CONFIRMED") {
			  const ts = new Date().toISOString();
			  set.push("confirmed_at=?"); binds.push(body.confirmed_at ?? ts);
			  set.push("confirmed_by=?"); binds.push(body.confirmed_by ?? "admin");
			}
  
			// se passar a PENDING/CANCELLED e não vier explicitamente, limpamos confirmação
			if (body.status !== "CONFIRMED") {
			  if (body.confirmed_at === undefined) { set.push("confirmed_at=?"); binds.push(null); }
			  if (body.confirmed_by === undefined) { set.push("confirmed_by=?"); binds.push(null); }
			}
		  } else {
			// permite set manual de confirmed_at/by sem mexer no status
			if (body.confirmed_at === null || typeof body.confirmed_at === "string") { set.push("confirmed_at=?"); binds.push(body.confirmed_at); }
			if (body.confirmed_by === null || typeof body.confirmed_by === "string") { set.push("confirmed_by=?"); binds.push(body.confirmed_by); }
		  }
  
		  if (!set.length) return cors(json({ error: "Nada para atualizar" }, 400));
  
		  binds.push(duesId);
  
		  await env.DB.prepare(`UPDATE dues_periods SET ${set.join(", ")} WHERE id = ?`).bind(...binds).run();
  
		  return cors(json({ ok: true }));
		}
  
		// --- ADMIN: DELETE a dues record (apagar do histórico)
		if (req.method === "DELETE" && /^\/admin\/dues\/[^\/]+$/.test(path)) {
		  requireAdmin(req, env);
		  const duesId = parseDuesIdFromPath(path);
		  if (!duesId) return cors(json({ error: "dues id inválido" }, 400));
  
		  await env.DB.prepare(`DELETE FROM dues_periods WHERE id = ?`).bind(duesId).run();
		  return cors(json({ ok: true }));
		}
  
		return cors(json({ error: "Not found" }, 404));
	  } catch (e: any) {
		if (e instanceof Response) return cors(e);
		return cors(json({ error: e?.message || "Erro inesperado" }, 500));
	  }
	},
  };
  