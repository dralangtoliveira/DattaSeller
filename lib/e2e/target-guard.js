// Guarda de isolamento do E2E autenticado (Final Gate n. 4).
//
// Requisito obrigatório: nenhum E2E autenticado — e nenhum cleanup mutável —
// pode alcançar o banco ou o domínio de Production. O guard falha fechado: sem
// evidência positiva de alvo isolado, nada é executado.
//
// Regras verificadas antes da primeira chamada de rede:
//   1. `NEXT_PUBLIC_SUPABASE_URL` precisa ser um projeto Supabase endereçável;
//   2. o ref do projeto não pode ser o de Production;
//   3. `DS_E2E_EXPECTED_SUPABASE_REF` precisa declarar exatamente esse ref —
//      o alvo nunca é aceito por omissão;
//   4. `DS_E2E_BASE_URL` não pode apontar para domínio de Production;
//   5. a chave de servidor (cleanup) herda o mesmo alvo declarado.
//
// O guard nunca imprime valor de segredo: só nomes de variável, host e ref.
export const PRODUCTION_SUPABASE_REF = "vkvkzoulbljampcbxaim";
export const PRODUCTION_HOSTS = ["crm.datta360.com.br", "www.datta360.com.br", "datta360.com.br"];
export const DECLARED_REF_ENV = "DS_E2E_EXPECTED_SUPABASE_REF";
export const SERVER_KEY_ENV = "SUPABASE_SECRET_KEY";

export function parseUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

export function hostFromUrl(value) {
  return parseUrl(value)?.hostname.toLowerCase() ?? null;
}

/** Extrai o ref do projeto de uma URL `https://<ref>.supabase.co`. */
export function supabaseRefFromUrl(value) {
  const host = hostFromUrl(value);
  if (!host) return null;
  const match = /^([a-z0-9-]{6,})\.supabase\.(co|in)$/.exec(host);
  return match ? match[1] : null;
}

export function isProductionRef(ref) {
  return String(ref ?? "").trim().toLowerCase() === PRODUCTION_SUPABASE_REF;
}

/**
 * Valida que o alvo do E2E está isolado de Production.
 * Retorna `{ ok, blockers, notes, target }` — nunca lança e nunca imprime segredo.
 */
export function guardE2eTarget(env = {}, { requireBaseUrl = true } = {}) {
  const blockers = [];
  const notes = [];

  const supabaseUrl = String(env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const declaredRef = String(env[DECLARED_REF_ENV] ?? "").trim().toLowerCase();
  const baseUrl = String(env.DS_E2E_BASE_URL ?? "").trim();
  const serverKeyName = SERVER_KEY_ENV;
  const hasServerKey = Boolean(String(env[SERVER_KEY_ENV] ?? "").trim());

  const ref = supabaseRefFromUrl(supabaseUrl);
  const baseHost = hostFromUrl(baseUrl);

  if (!supabaseUrl) blockers.push({ code: "missing_supabase_url", detail: "NEXT_PUBLIC_SUPABASE_URL não definido" });
  else if (!ref) blockers.push({ code: "unparsable_supabase_url", detail: "NEXT_PUBLIC_SUPABASE_URL não é uma URL de projeto Supabase (<ref>.supabase.co)" });
  else if (isProductionRef(ref)) blockers.push({ code: "production_database", detail: `o ref ${ref} é o Supabase de Production — E2E proibido` });

  if (!declaredRef) blockers.push({ code: "missing_declared_ref", detail: `${DECLARED_REF_ENV} precisa declarar o ref esperado do HML (o alvo não é aceito por omissão)` });
  else if (isProductionRef(declaredRef)) blockers.push({ code: "declared_ref_is_production", detail: `${DECLARED_REF_ENV} aponta para Production` });
  else if (ref && declaredRef !== ref) blockers.push({ code: "declared_ref_mismatch", detail: `${DECLARED_REF_ENV} não corresponde ao projeto de NEXT_PUBLIC_SUPABASE_URL` });

  if (!baseUrl) { if (requireBaseUrl) blockers.push({ code: "missing_base_url", detail: "DS_E2E_BASE_URL não definido" }); }
  else if (!baseHost) blockers.push({ code: "unparsable_base_url", detail: "DS_E2E_BASE_URL não é uma URL http(s) válida" });
  else if (PRODUCTION_HOSTS.includes(baseHost)) blockers.push({ code: "production_host", detail: `${baseHost} é domínio de Production — E2E proibido` });
  else if (!baseHost.endsWith(".vercel.app")) notes.push({ code: "base_url_not_vercel_preview", detail: `alvo ${baseHost} não é um host de Preview da Vercel; confirmar que é HML isolado` });

  if (hasServerKey && ref) notes.push({ code: "server_key_present", detail: `${serverKeyName} presente: o cleanup usará o mesmo projeto ${ref}` });

  return {
    ok: blockers.length === 0,
    blockers,
    notes,
    target: { ref, host: baseHost, production: isProductionRef(ref) || PRODUCTION_HOSTS.includes(baseHost ?? "") },
  };
}

/** Linhas sanitizadas para log/CI. Nunca inclui valor de segredo. */
export function formatGuardReport(result) {
  const lines = [`alvo declarado: projeto=${result.target.ref ?? "-"} host=${result.target.host ?? "-"}`];
  for (const note of result.notes ?? []) lines.push(`aviso [${note.code}]: ${note.detail}`);
  for (const blocker of result.blockers ?? []) lines.push(`bloqueio [${blocker.code}]: ${blocker.detail}`);
  lines.push(result.ok ? "isolamento: OK (alvo isolado de Production)" : "isolamento: RECUSADO (nada foi executado)");
  return lines;
}

export function assertIsolatedTarget(env = {}) {
  const result = guardE2eTarget(env);
  if (!result.ok) {
    const error = new Error("e2e_target_not_isolated");
    error.blockers = result.blockers;
    error.report = formatGuardReport(result);
    throw error;
  }
  return result;
}
