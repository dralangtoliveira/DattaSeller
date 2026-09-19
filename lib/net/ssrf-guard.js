/**
 * Proteção SSRF para todo fetch server-side que aceita URL de terceiro.
 *
 * Entradas hostis consideradas: localhost, 127.0.0.0/8, ::1, faixas privadas
 * RFC1918, link-local (inclui metadata cloud 169.254.169.254), CGNAT,
 * multicast/reservado, endereços IPv6 equivalentes, host que resolve para IP
 * privado e redirecionamento de URL pública para destino privado.
 *
 * A decisão é sempre fail-closed: sem resolução confiável, sem resposta.
 */

import { lookup } from "node:dns/promises";

export const SSRF_CODES = {
  scheme: "ssrf_blocked_scheme",
  host: "ssrf_blocked_host",
  privateIp: "ssrf_blocked_private_address",
  unresolved: "ssrf_unresolved_host",
  redirectLimit: "ssrf_redirect_limit",
};

export class UnsafeTargetError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "UnsafeTargetError";
    this.code = code;
    this.details = details;
  }
}

export const isSsrfCode = (code) => String(code ?? "").startsWith("ssrf_");

/** Hosts que nunca podem ser alvo, mesmo sem DNS. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback", "metadata", "metadata.google.internal",
  "instance-data", "metadata.goog", "kubernetes.default", "kubernetes.default.svc",
]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".in-addr.arpa", ".ip6.arpa"];

const ipv4Bytes = (value) => {
  const parts = String(value ?? "").split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  return numbers.every((number) => Number.isInteger(number) && number >= 0 && number <= 255) ? numbers : null;
};

/** IPv4 privado, loopback, link-local, CGNAT, multicast, reservado e broadcast. */
export function isBlockedIpv4(a, b, c) {
  if ([a, b, c].some((part) => !Number.isInteger(part))) return true;
  if (a === 0) return true;                       // 0.0.0.0/8
  if (a === 10) return true;                      // RFC1918
  if (a === 127) return true;                     // loopback
  if (a === 169 && b === 254) return true;        // link-local + metadata cloud
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true;        // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0 && c === 0) return true;  // IETF protocol assignments
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a >= 224) return true;                      // multicast, reservado e broadcast
  return false;
}

/** Expande IPv6 (com ou sem IPv4 embutido) em 16 bytes. */
function ipv6Bytes(input) {
  let address = String(input ?? "").trim().replace(/^\[|\]$/g, "").toLowerCase();
  if (!address.includes(":")) return null;
  if (address.includes(".")) {
    const index = address.lastIndexOf(":");
    const embedded = ipv4Bytes(address.slice(index + 1));
    if (!embedded) return null;
    const high = ((embedded[0] << 8) | embedded[1]).toString(16);
    const low = ((embedded[2] << 8) | embedded[3]).toString(16);
    address = `${address.slice(0, index)}:${high}:${low}`;
  }
  const compressed = address.includes("::");
  const [head, tail] = address.split("::");
  const headParts = head ? head.split(":").filter(Boolean) : [];
  const tailParts = tail ? tail.split(":").filter(Boolean) : [];
  const total = headParts.length + tailParts.length;
  if (compressed ? total > 7 : total !== 8) return null;
  const parts = compressed ? [...headParts, ...Array.from({ length: 8 - total }, () => "0"), ...tailParts] : headParts;
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  const bytes = new Uint8Array(16);
  parts.forEach((part, index) => {
    const value = parseInt(part, 16);
    bytes[index * 2] = value >> 8;
    bytes[index * 2 + 1] = value & 0xff;
  });
  return bytes;
}

/** IPv6 loopback, unspecified, ULA, link-local, multicast e túneis com IPv4 embutido. */
export function isBlockedIpv6(bytes) {
  const all = (from, to) => bytes.slice(from, to).every((byte) => byte === 0);
  if (all(0, 16)) return true;                                    // ::
  if (all(0, 15) && bytes[15] === 1) return true;                 // ::1
  if (all(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) {   // ::ffff:a.b.c.d
    return isBlockedIpv4(bytes[12], bytes[13], bytes[14]);
  }
  if (all(0, 12) && !all(12, 16)) return isBlockedIpv4(bytes[12], bytes[13], bytes[14]); // ::a.b.c.d
  if ((bytes[0] & 0xfe) === 0xfc) return true;                    // fc00::/7 (ULA)
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10
  if (bytes[0] === 0xff) return true;                             // multicast
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return true;        // 2002::/16 (6to4)
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) return true; // Teredo
  if (bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b) return true; // NAT64
  return false;
}

export function isBlockedAddress(address) {
  const value = String(address ?? "").trim().replace(/^\[|\]$/g, "");
  const v4 = ipv4Bytes(value);
  if (v4) return isBlockedIpv4(v4[0], v4[1], v4[2]);
  const v6 = ipv6Bytes(value);
  if (!v6) return true; // não é endereço interpretável: bloqueia (fail-closed)
  return isBlockedIpv6(v6);
}

export function isBlockedHostname(hostname) {
  const host = String(hostname ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  if (ipv4Bytes(host) || ipv6Bytes(host)) return isBlockedAddress(host);
  // Host de rótulo único só resolve por DNS interno: bloqueia (fail-closed).
  return !host.includes(".");
}

export function parseTargetUrl(input) {
  let url;
  try {
    url = new URL(String(input ?? "").trim());
  } catch {
    throw new UnsafeTargetError(SSRF_CODES.scheme, "Endereço inválido: não foi possível interpretar a URL.", { url: String(input ?? "") });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeTargetError(SSRF_CODES.scheme, `Protocolo não permitido: ${url.protocol}`, { url: url.toString() });
  }
  if (isBlockedHostname(url.hostname)) {
    throw new UnsafeTargetError(SSRF_CODES.host, "Destino bloqueado: host local, privado ou reservado.", { host: url.hostname });
  }
  return url;
}

const defaultResolve = async (host) => lookup(host, { all: true, verbatim: true });

/**
 * Valida URL e resolve o host, recusando qualquer endereço não público.
 * Resolução sem resultado confiável também recusa (fail-closed).
 */
export async function assertSafeTarget(input, { resolveHost = defaultResolve, label = "destino" } = {}) {
  const url = parseTargetUrl(input);
  let addresses;
  try {
    addresses = await resolveHost(url.hostname);
  } catch (error) {
    throw new UnsafeTargetError(SSRF_CODES.unresolved, `Não foi possível resolver o host do ${label}.`, { host: url.hostname, cause: error?.code ?? error?.name ?? null });
  }
  const list = (Array.isArray(addresses) ? addresses : [addresses]).filter(Boolean);
  if (!list.length) throw new UnsafeTargetError(SSRF_CODES.unresolved, `O host do ${label} não resolveu para nenhum endereço.`, { host: url.hostname });
  for (const entry of list) {
    const address = typeof entry === "string" ? entry : entry.address;
    if (!address || isBlockedAddress(address)) {
      throw new UnsafeTargetError(SSRF_CODES.privateIp, `O host do ${label} resolve para um endereço não público.`, { host: url.hostname, address: address ?? null });
    }
  }
  return { url, addresses: list.map((entry) => (typeof entry === "string" ? entry : entry.address)) };
}

/**
 * Fetch que nunca segue redirect por conta própria: cada salto é validado
 * (inclusive resolução DNS) antes da próxima requisição.
 */
export async function guardedFetch(input, { fetchImpl = fetch, resolveHost = defaultResolve, maxRedirects = 5, label = "destino", ...init } = {}) {
  let current = String(input);
  const chain = [];
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const { url } = await assertSafeTarget(current, { resolveHost, label });
    chain.push(url.toString());
    const response = await fetchImpl(url.toString(), { ...init, redirect: "manual" });
    const status = Number(response?.status ?? 0);
    const location = status >= 300 && status <= 308 && status !== 304 ? response.headers?.get?.("location") : null;
    if (!location) return { response, url: url.toString(), redirects: hop, chain };
    let next;
    try {
      next = new URL(location, url).toString();
    } catch {
      throw new UnsafeTargetError(SSRF_CODES.scheme, "Redirecionamento com destino inválido.", { from: url.toString(), location: String(location) });
    }
    current = next;
  }
  throw new UnsafeTargetError(SSRF_CODES.redirectLimit, `O ${label} redirecionou mais de ${maxRedirects} vezes.`, { url: String(input) });
}
