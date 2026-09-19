import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SSRF_CODES,
  UnsafeTargetError,
  assertSafeTarget,
  guardedFetch,
  isBlockedAddress,
  isBlockedHostname,
  parseTargetUrl,
} from "../lib/net/ssrf-guard.js";
import { DiagnosisError, diagnoseSite } from "../lib/diagnosis/site.js";
import { EnrichmentError, enrichFromWebsite, enrichLead } from "../lib/enrichment/provider.js";
import { DiscoveryError, discoverCompanies } from "../lib/discovery/provider.js";

const readFile = (url) => readFileSync(url, "utf8");

const RESOLVE_PUBLICO = async () => [{ address: "93.184.216.34", family: 4 }];
const resolverDe = (address, family = 4) => async () => [{ address, family }];
const resposta = (body = "ok", { status = 200, location = null, type = "text/html" } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => (String(name).toLowerCase() === "location" ? location : String(name).toLowerCase() === "content-type" ? type : null) },
  text: async () => body,
});

test("hosts locais, privados e reservados são recusados pelo nome", () => {
  for (const host of ["localhost", "LOCALHOST", "localhost.", "ip6-localhost", "metadata.google.internal", "instance-data", "kubernetes.default", "api.internal", "printer.local", "intranet", "servidor"]) {
    assert.equal(isBlockedHostname(host), true, `${host} precisa ser bloqueado`);
  }
  for (const host of ["empresa.example", "crm.datta360.com.br", "nominatim.openstreetmap.org"]) {
    assert.equal(isBlockedHostname(host), false, `${host} é host público`);
  }
  assert.equal(isBlockedHostname(""), true);
});

test("endereços não públicos são recusados em todas as formas", () => {
  const bloqueados = [
    "127.0.0.1", "127.1.2.3", "0.0.0.0", "10.0.0.5", "172.16.0.1", "172.31.255.254", "192.168.0.10",
    "169.254.169.254", "100.64.0.1", "192.0.0.1", "198.18.0.1", "224.0.0.1", "239.255.255.250", "255.255.255.255",
    "::1", "::", "fd00::1", "fc00::abcd", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::127.0.0.1",
    "2002:7f00:1::1", "2001:0000:4136:e378:8000:63bf:3fff:fdd2", "64:ff9b::7f00:1",
  ];
  for (const address of bloqueados) assert.equal(isBlockedAddress(address), true, `${address} precisa ser bloqueado`);
  for (const address of ["93.184.216.34", "8.8.8.8", "2606:2800:220:1:248:1893:25c8:1946", "2600:1901::1"]) {
    assert.equal(isBlockedAddress(address), false, `${address} é público`);
  }
  assert.equal(isBlockedAddress("nao-e-ip"), true, "endereço incompreensível falha fechado");
});

test("URL com esquema inválido ou host privado não passa", () => {
  for (const url of ["file:///etc/passwd", "ftp://empresa.example/", "gopher://127.0.0.1/", "javascript:alert(1)", "data:text/html,x", "nao-e-url"]) {
    assert.throws(() => parseTargetUrl(url), (error) => error instanceof UnsafeTargetError, `${url} precisa ser recusado`);
  }
  assert.throws(() => parseTargetUrl("http://localhost:3000/api/leads"), (error) => error.code === SSRF_CODES.host);
  assert.throws(() => parseTargetUrl("http://2130706433/"), (error) => error.code === SSRF_CODES.host, "IPv4 decimal precisa ser recusado");
  assert.throws(() => parseTargetUrl("http://0x7f000001/"), (error) => error.code === SSRF_CODES.host, "IPv4 hexadecimal precisa ser recusado");
  assert.throws(() => parseTargetUrl("http://0177.0.0.1/"), (error) => error.code === SSRF_CODES.host, "IPv4 octal precisa ser recusado");
  assert.throws(() => parseTargetUrl("http://[::1]/"), (error) => error.code === SSRF_CODES.host);
  assert.equal(parseTargetUrl("https://empresa.example/contato").hostname, "empresa.example");
});

test("host público que resolve para endereço privado é recusado (fail-closed)", async () => {
  await assert.rejects(
    () => assertSafeTarget("https://interno.exemplo.com/", { resolveHost: resolverDe("10.1.2.3") }),
    (error) => error instanceof UnsafeTargetError && error.code === SSRF_CODES.privateIp
  );
  await assert.rejects(
    () => assertSafeTarget("https://misto.exemplo.com/", { resolveHost: async () => [{ address: "93.184.216.34", family: 4 }, { address: "192.168.0.5", family: 4 }] }),
    (error) => error.code === SSRF_CODES.privateIp,
    "um único registro privado já invalida o destino"
  );
  await assert.rejects(
    () => assertSafeTarget("https://sem-dns.exemplo.com/", { resolveHost: async () => { throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }); } }),
    (error) => error.code === SSRF_CODES.unresolved
  );
  await assert.rejects(
    () => assertSafeTarget("https://vazio.exemplo.com/", { resolveHost: async () => [] }),
    (error) => error.code === SSRF_CODES.unresolved
  );
  const ok = await assertSafeTarget("https://empresa.example/", { resolveHost: RESOLVE_PUBLICO });
  assert.equal(ok.url.hostname, "empresa.example");
  assert.deepEqual(ok.addresses, ["93.184.216.34"]);
});

test("redirect de URL pública para destino privado é recusado antes da segunda requisição", async () => {
  const chamadas = [];
  const fetch = async (url) => {
    chamadas.push(String(url));
    if (String(url).includes("publico.example")) return resposta("", { status: 302, location: "http://169.254.169.254/latest/meta-data/" });
    return resposta("<html><title>Destino interno</title></html>");
  };
  await assert.rejects(
    () => guardedFetch("https://publico.example/", { fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO }),
    (error) => error instanceof UnsafeTargetError && [SSRF_CODES.host, SSRF_CODES.privateIp].includes(error.code)
  );
  assert.deepEqual(chamadas, ["https://publico.example/"], "o destino privado não pode ser requisitado");
});

test("redirect público continua funcionando e há limite de saltos", async () => {
  const fetch = async (url) => (String(url) === "https://empresa.example/" ? resposta("", { status: 301, location: "https://www.empresa.example/home" }) : resposta("<html><title>Home</title></html>"));
  const { response, url, redirects, chain } = await guardedFetch("https://empresa.example/", { fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO });
  assert.equal(response.status, 200);
  assert.equal(url, "https://www.empresa.example/home");
  assert.equal(redirects, 1);
  assert.deepEqual(chain, ["https://empresa.example/", "https://www.empresa.example/home"]);
  const loop = async (url) => resposta("", { status: 302, location: String(url) });
  await assert.rejects(
    () => guardedFetch("https://loop.example/", { fetchImpl: loop, resolveHost: RESOLVE_PUBLICO, maxRedirects: 2 }),
    (error) => error.code === SSRF_CODES.redirectLimit
  );
});

test("o diagnóstico recusa site privado sem abrir a conexão", async () => {
  let chamadas = 0;
  const fetch = async () => { chamadas += 1; return resposta("<html></html>"); };
  for (const alvo of ["http://127.0.0.1:3000/", "http://localhost/admin", "http://169.254.169.254/latest/meta-data/", "http://10.0.0.7/", "http://[::1]/"]) {
    await assert.rejects(
      () => diagnoseSite(alvo, { fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO }),
      (error) => error instanceof DiagnosisError && String(error.code).startsWith("ssrf_"),
      `${alvo} precisa ser recusado`
    );
  }
  await assert.rejects(
    () => diagnoseSite("https://interno.exemplo.com/", { fetchImpl: fetch, resolveHost: resolverDe("192.168.1.10") }),
    (error) => error instanceof DiagnosisError && String(error.code).startsWith("ssrf_")
  );
  assert.equal(chamadas, 0, "nenhuma requisição pode sair para destino bloqueado");
});

test("o enriquecimento não abre site privado e registra o motivo", async () => {
  let chamadas = 0;
  const fetch = async () => { chamadas += 1; return resposta("<html>contato@empresa.example</html>"); };
  await assert.rejects(
    () => enrichFromWebsite("http://192.168.0.10/", { fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO }),
    (error) => error instanceof UnsafeTargetError && String(error.code).startsWith("ssrf_")
  );
  assert.equal(chamadas, 0);
  const osm = async (url) => (String(url).includes("nominatim") ? resposta("[{\"display_name\":\"Empresa\",\"name\":\"Empresa\",\"osm_type\":\"node\",\"osm_id\":1,\"extratags\":{\"website\":\"empresa.example\"}}]", { type: "application/json" }) : resposta("x"));
  const resultado = await enrichLead({ lead: { nome: "Empresa", cidade: "Orlando, FL", site_antigo: "http://10.0.0.9/" }, fetchImpl: osm, resolveHost: RESOLVE_PUBLICO });
  assert.equal(resultado.warnings.length, 1);
  assert.match(String(resultado.warnings[0].error), /^ssrf_/);
  assert.equal(resultado.fields.site_antigo.value, "https://empresa.example", "a fonte pública continua completando o lead");
  assert.equal(chamadas, 0, "o site privado nunca é aberto");
});

test("a descoberta não aceita provedor apontando para rede privada", async () => {
  let chamadas = 0;
  const fetch = async () => { chamadas += 1; return resposta("{}", { type: "application/json" }); };
  await assert.rejects(
    () => discoverCompanies({ nicho: "restaurante", cidade: "Orlando, FL", fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO, overpassUrl: "http://127.0.0.1:9999/interpreter", place: { nome: "Orlando", bbox: [28.34, 28.66, -81.52, -81.2] } }),
    (error) => error instanceof DiscoveryError && String(error.code).startsWith("ssrf_")
  );
  assert.equal(chamadas, 0);
});

test("o guard não interfere em fonte pública real", async () => {
  const fetch = async () => resposta("<html><head><title>Empresa</title></head><body><a href=\"mailto:contato@empresa.example\">Fale</a></body></html>");
  const extraido = await enrichFromWebsite("https://empresa.example/", { fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO });
  assert.equal(extraido.fields.email.value, "contato@empresa.example");
  const diagnostico = await diagnoseSite("https://empresa.example/", { fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO });
  assert.equal(diagnostico.fatos.titulo, "Empresa");
});

test("nenhum provedor chama fetch sem passar pelo guard", () => {
  for (const caminho of ["../lib/enrichment/provider.js", "../lib/diagnosis/site.js", "../lib/discovery/provider.js"]) {
    const fonte = readFile(new URL(caminho, import.meta.url));
    assert.match(fonte, /guardedFetch/, `${caminho} precisa usar guardedFetch`);
    assert.doesNotMatch(fonte, /redirect:\s*"follow"/, `${caminho} não pode seguir redirect sem validação`);
    assert.doesNotMatch(fonte, /fetchImpl\(url, \{ \.\.\.init, signal \}\)/, `${caminho} não pode chamar o fetch direto`);
  }
});
