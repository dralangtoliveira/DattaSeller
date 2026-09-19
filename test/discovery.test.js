import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DISCOVERY_MAX_LIMIT,
  DiscoveryError,
  buildOverpassQuery,
  discoverCompanies as discoverCompaniesReal,
  elementToResult,
  geocodePlace,
  nicheSelector,
  overpassBbox,
  resetGeocodeCache,
} from "../lib/discovery/provider.js";
import { disambiguateSlug, publicContactType, resultsToCandidates } from "../lib/discovery/candidates.js";
import { duplicateOf, isPublicHttpUrl, normalizeUrl } from "../lib/prospector.js";
import { LEAD_INPUT_KEYS } from "../lib/hardening/guards.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
// Resolução pública injetada: os testes não dependem de DNS real, mas exercitam
// a mesma checagem de endereço privado do guard SSRF.
const RESOLVE_PUBLICO = async () => [{ address: "93.184.216.34", family: 4 }];
const discoverCompanies = (opcoes = {}) => discoverCompaniesReal({ resolveHost: RESOLVE_PUBLICO, ...opcoes });
const route = ler("../app/api/[...path]/route.ts");
const poc = ler("../poc/dattaseller-local/app/dashboard.html");
const publicado = ler("../public/dashboard.html");

const PLACE = { nome: "Orlando, Orange County, Florida, United States", tipo: "administrative", bbox: [28.34, 28.66, -81.52, -81.2], latitude: 28.5, longitude: -81.36, provider_id: "relation/112345" };
const RESTAURANTE = {
  type: "node",
  id: 987654,
  lat: 28.5,
  lon: -81.37,
  tags: {
    name: "Café Real Orlando",
    amenity: "restaurant",
    cuisine: "pizza",
    "addr:street": "Main Street",
    "addr:housenumber": "120",
    "addr:city": "Orlando",
    "addr:state": "FL",
    "addr:postcode": "32801",
    phone: "+1 407-555-0100",
    website: "https://caferreal.example/",
    "contact:instagram": "@caferreal",
  },
};
const SEM_NOME = { type: "node", id: 111, lat: 28.4, lon: -81.3, tags: { amenity: "restaurant" } };
const FECHADO = { type: "way", id: 222, center: { lat: 28.41, lon: -81.31 }, tags: { name: "Cantina Antiga", amenity: "restaurant", "disused:amenity": "restaurant" } };

const resposta = (body, ok = true, status = 200) => ({ ok, status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
const corpoEnviado = (init) => decodeURIComponent(String(init?.body ?? "")).replace(/\+/g, " ");

function fetchFalso({ elements = [RESTAURANTE, SEM_NOME, FECHADO], nominatim = [ { display_name: PLACE.nome, lat: PLACE.latitude, lon: PLACE.longitude, boundingbox: PLACE.bbox.map(String), type: PLACE.tipo, osm_type: "relation", osm_id: 112345 } ], captura = [] } = {}) {
  return async (url, init = {}) => {
    captura.push({ url: String(url), init });
    if (String(url).includes("nominatim")) return resposta(nominatim);
    return resposta({ version: 0.6, elements });
  };
}

test("o nicho informado vira uma tag real da fonte pública", () => {
  assert.equal(nicheSelector("Restaurantes").strategy, "categoria");
  assert.match(nicheSelector("restaurante").selector, /\["amenity"="restaurant"\]/);
  assert.match(nicheSelector("clínica de estética").selector, /\["shop"~"\^\(beauty\|hairdresser\)\$"\]/);
  const desconhecido = nicheSelector("estúdio de tatuagem");
  assert.equal(desconhecido.strategy, "texto");
  assert.match(desconhecido.selector, /name/);
  assert.ok(desconhecido.warning, "nicho não mapeado precisa avisar que exige revisão");
  assert.throws(() => nicheSelector("  "), (error) => error instanceof DiscoveryError && error.code === "discovery_invalid_query");
});

test("a consulta Overpass usa a área geocodificada e o limite pedido", () => {
  // Nominatim devolve [sul, norte, oeste, leste]; o Overpass exige (sul, oeste, norte, leste).
  assert.deepEqual(overpassBbox(PLACE.bbox), [28.34, -81.52, 28.66, -81.2]);
  const query = buildOverpassQuery({ selector: nicheSelector("restaurante").selector, bbox: overpassBbox(PLACE.bbox), limit: 20 });
  assert.match(query, /\[out:json\]\[timeout:25\]/);
  assert.match(query, /\(28\.34,-81\.52,28\.66,-81\.2\)/);
  assert.match(query, /out body center 20;/);
  assert.doesNotMatch(query, /\(bbox\)/);
  assert.throws(() => buildOverpassQuery({ selector: "nwr(bbox);", bbox: [1, 2], limit: 5 }), DiscoveryError);
  assert.throws(() => buildOverpassQuery({ selector: "nwr(bbox);", bbox: [28.66, -81.52, 28.34, -81.2], limit: 5 }), DiscoveryError);
});

test("o elemento da fonte vira empresa com origem, categoria e campos ausentes marcados", () => {
  const empresa = elementToResult(RESTAURANTE, { checkedAt: "2026-09-19T12:00:00.000Z" });
  assert.equal(empresa.nome, "Café Real Orlando");
  assert.equal(empresa.categoria, "restaurant");
  assert.equal(empresa.categoria_fonte, "amenity=restaurant");
  assert.equal(empresa.endereco, "Main Street, 120 · Orlando, FL · 32801");
  assert.equal(empresa.telefone, "+1 407-555-0100");
  assert.equal(empresa.site, "https://caferreal.example/");
  assert.equal(empresa.instagram, "https://instagram.com/caferreal");
  assert.equal(empresa.source_url, "https://www.openstreetmap.org/node/987654");
  assert.equal(empresa.source_checked_at, "2026-09-19T12:00:00.000Z");
  assert.deepEqual(empresa.campos_indisponiveis, ["email"]);
  assert.equal(elementToResult(SEM_NOME, { checkedAt: "x" }), null, "empresa sem nome não é dado utilizável");
  const semNada = elementToResult({ type: "way", id: 1, center: { lat: 1, lon: 2 }, tags: { name: "Sem contato" } }, { checkedAt: "x" });
  assert.equal(semNada.telefone, "");
  assert.equal(semNada.site, "");
  assert.equal(semNada.categoria, "");
  assert.deepEqual(semNada.campos_indisponiveis, ["endereco", "telefone", "website", "email", "categoria"]);
});

test("a descoberta real consulta a fonte pública e devolve empresas reais com proveniência", async () => {
  const captura = [];
  const busca = await discoverCompanies({ nicho: "restaurante", cidade: "Orlando, FL", quantidade: 5, limite: 10, fetchImpl: fetchFalso({ captura }), place: PLACE, now: () => new Date("2026-09-19T12:00:00.000Z") });
  assert.equal(busca.provider, "openstreetmap");
  assert.equal(busca.strategy, "categoria");
  assert.match(busca.licence, /ODbL/);
  assert.equal(busca.searched_at, "2026-09-19T12:00:00.000Z");
  assert.equal(busca.considerados, 3);
  assert.deepEqual(busca.ignorados, { sem_nome: 1, desativados: 1 });
  assert.equal(busca.results.length, 1);
  assert.equal(busca.results[0].provider_id, "node/987654");
  const overpass = captura.find((chamada) => !chamada.url.includes("nominatim"));
  assert.equal(overpass.init.method, "POST");
  assert.match(corpoEnviado(overpass.init), /amenity"="restaurant/);
});

test("quantidade alvo não limita o retorno: o limite de candidatos limita", async () => {
  // Regra explícita: quantidade alvo 5 com limite 25 pode devolver até 25.
  const muitos = Array.from({ length: 30 }, (_, index) => ({ type: "node", id: 5000 + index, lat: 28.4, lon: -81.3, tags: { name: `Empresa ${index}`, amenity: "restaurant", phone: `+1407555${String(index).padStart(4, "0")}` } }));
  const captura = [];
  const busca = await discoverCompanies({ nicho: "restaurante", cidade: "Orlando, FL", quantidade: 5, limite: 25, fetchImpl: fetchFalso({ elements: muitos, captura }), place: PLACE });
  assert.equal(busca.results.length, 25, "o retorno é limitado pelo limite de candidatos, não pela quantidade alvo");
  assert.equal(busca.query.quantidade_alvo, 5);
  assert.equal(busca.query.limite_candidatos, 25);
  assert.match(busca.query.regra, /limite de candidatos/);
  assert.match(busca.query.regra, /quantidade alvo/);
  const menor = await discoverCompanies({ nicho: "restaurante", cidade: "Orlando, FL", quantidade: 30, limite: 4, fetchImpl: fetchFalso({ elements: muitos }), place: PLACE });
  assert.equal(menor.results.length, 4, "o limite de candidatos é o teto, mesmo quando a quantidade alvo é maior");
  assert.equal(menor.query.limite_candidatos, 4);
  assert.equal(menor.query.quantidade_alvo, 30);
});

test("a lista prioriza empresas com contato público e busca amostra maior", async () => {
  const semContato = { type: "node", id: 1, lat: 28.4, lon: -81.3, tags: { name: "Aaa Sem Contato", amenity: "restaurant" } };
  const comContato = { type: "node", id: 2, lat: 28.4, lon: -81.3, tags: { name: "Zzz Com Contato", amenity: "restaurant", phone: "+1 407-555-0199", website: "https://zzz.example/" } };
  const captura = [];
  const busca = await discoverCompanies({ nicho: "restaurante", cidade: "Orlando, FL", quantidade: 2, limite: 25, fetchImpl: fetchFalso({ elements: [semContato, comContato], captura }), place: PLACE });
  assert.deepEqual(busca.results.map((empresa) => empresa.nome), ["Zzz Com Contato", "Aaa Sem Contato"]);
  const overpass = captura.find((chamada) => !chamada.url.includes("nominatim"));
  assert.match(corpoEnviado(overpass.init), /out body center 25;/, "a amostra consultada precisa ser maior que o pedido");
});

test("sem localidade encontrada a busca não devolve empresa nenhuma", async () => {
  resetGeocodeCache();
  await assert.rejects(
    () => discoverCompanies({ nicho: "restaurante", cidade: "Cidade Inexistente Xyz", fetchImpl: fetchFalso({ nominatim: [] }), now: () => new Date() }),
    (error) => error instanceof DiscoveryError && error.code === "discovery_place_not_found"
  );
  const comFalha = async () => { throw new Error("ENOTFOUND"); };
  await assert.rejects(
    () => discoverCompanies({ nicho: "restaurante", cidade: "Orlando, FL", fetchImpl: comFalha, place: PLACE }),
    (error) => error instanceof DiscoveryError && error.code === "discovery_provider_unavailable"
  );
  const statusRuim = async () => resposta("", false, 429);
  await assert.rejects(
    () => discoverCompanies({ nicho: "restaurante", cidade: "Orlando, FL", fetchImpl: statusRuim, place: PLACE }),
    (error) => error instanceof DiscoveryError && error.code === "discovery_provider_unavailable" && error.details.status === 429
  );
  const timeout = async () => { const error = new Error("aborted"); error.name = "AbortError"; throw error; };
  await assert.rejects(
    () => discoverCompanies({ nicho: "restaurante", cidade: "Orlando, FL", fetchImpl: timeout, place: PLACE }),
    (error) => error instanceof DiscoveryError && error.code === "discovery_provider_timeout"
  );
});

test("a geocodificação respeita a política de uso e o cache da fonte", async () => {
  resetGeocodeCache();
  const captura = [];
  const fetch = fetchFalso({ captura });
  const primeira = await geocodePlace("Orlando, FL", { fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO });
  const segunda = await geocodePlace("orlando, fl", { fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO });
  assert.deepEqual(primeira, segunda);
  assert.equal(captura.length, 1, "a mesma cidade não pode consultar o Nominatim duas vezes");
  assert.match(captura[0].url, /format=jsonv2/);
  assert.ok(captura[0].init.headers["User-Agent"], "o provedor exige identificação do cliente");
  assert.deepEqual(primeira.bbox, PLACE.bbox);
});

test("o resultado vira candidato aceito pelo CRM, com fonte e sem dado inventado", () => {
  const [candidato] = resultsToCandidates([elementToResult(RESTAURANTE, { checkedAt: "2026-09-19T12:00:00.000Z" })], { nicho: "restaurante", cidade: "Orlando, FL" });
  assert.equal(candidato.slug, "cafe-real-orlando");
  assert.equal(candidato.nome, "Café Real Orlando");
  assert.equal(candidato.nicho, "restaurante");
  assert.equal(candidato.cidade, "Orlando, FL");
  assert.equal(candidato.end_cliente, "Main Street, 120 · Orlando, FL · 32801");
  assert.equal(candidato.site_antigo, "https://caferreal.example/");
  assert.equal(candidato.source, "openstreetmap");
  assert.equal(candidato.source_url, "https://www.openstreetmap.org/node/987654");
  assert.equal(candidato.source_checked_at, "2026-09-19T12:00:00.000Z");
  assert.equal(candidato.public_contact_type, "telefone");
  assert.match(candidato.obs, /Categoria na fonte: amenity=restaurant/);
  assert.deepEqual(candidato.proveniencia.campos_indisponiveis, ["email"]);
  assert.ok(isPublicHttpUrl(candidato.source_url), "a fonte precisa ser uma URL pública");
  for (const chave of ["slug", "nome", "nicho", "cidade", "telefone", "site_antigo", "source", "source_url", "source_checked_at", "public_contact_type", "obs", "end_cliente"]) {
    assert.ok(LEAD_INPUT_KEYS.has(chave), `${chave} precisa ser campo aceito pelo CRM`);
  }
});

test("nomes repetidos e slugs já usados no CRM não se sobrescrevem", () => {
  const iguais = resultsToCandidates([{ nome: "Pizza Hut", provider_id: "node/1" }, { nome: "Pizza Hut", provider_id: "node/2" }], {});
  assert.deepEqual(iguais.map((candidato) => candidato.slug), ["pizza-hut", "pizza-hut-2"]);
  const tomados = new Set(["pizza-hut"]);
  assert.equal(disambiguateSlug("pizza-hut", tomados), "pizza-hut-2");
  assert.equal(disambiguateSlug("pizza-hut-2", tomados), "pizza-hut-2");
  assert.equal(disambiguateSlug("outra-loja", tomados), "outra-loja");
  assert.equal(publicContactType({ email: "contato@empresa.example", telefone: "+1 407 555 0100", site: "https://empresa.example" }), "e-mail");
  assert.equal(publicContactType({ endereco: "Main Street, 120" }), "endereço");
  assert.equal(publicContactType({}), "");
});

test("lead sem site não deduplica por domínio vazio", () => {
  // Regressão real: `new URL("https://undefined")` produzia o domínio literal
  // "undefined", então dois leads sem site eram tratados como duplicados.
  assert.equal(normalizeUrl(undefined, true), "");
  assert.equal(normalizeUrl(null, true), "");
  assert.equal(normalizeUrl("", true), "");
  assert.equal(normalizeUrl("https://www.exemplo.com/pagina/", true), "exemplo.com");
  const semSite = { slug: "empresa-a", nome: "Empresa A", cidade: "Orlando, FL", source_url: "https://www.openstreetmap.org/node/1" };
  assert.equal(duplicateOf(semSite, [{ slug: "empresa-b", nome: "Empresa B", cidade: "Orlando, FL", site_antigo: null }]), null);
  const comMesmoSite = { nome: "Outra Razão", cidade: "Miami, FL", site_antigo: "https://www.exemplo.com/" };
  assert.equal(duplicateOf(comMesmoSite, [{ slug: "empresa-c", nome: "Empresa C", cidade: "Orlando, FL", site_antigo: "https://exemplo.com/contato" }])?.criterion, "dominio");
});

test("a rota expõe a descoberta real, autenticada e com falha fechada", () => {
  const post = route.slice(route.indexOf("export async function POST"));
  assert.match(post, /if \(root === "discovery"\) \{/);
  assert.match(post, /discoverCompanies\(\{ nicho, cidade, quantidade, limite \}\)/);
  assert.match(post, /falha\.code/);
  assert.match(post, /const status = String\(falha\.code\)\.startsWith\("ssrf_"\) \? 400 : 503;/, "falha do provedor responde 503 e destino bloqueado responde 400");
  assert.match(post, /\}, status\);/, "a resposta precisa usar o status decidido pelo tipo de falha");
  assert.match(post, /results: \[\]/, "falha do provedor não devolve resultado parcial");
  assert.match(post, /duplicateOf\(candidate, leads \?\? \[\]\)/);
  assert.match(post, /disambiguateSlug\(candidate\.slug, takenSlugs\)/);
  assert.match(post, /body\.quantidade_alvo \?\? body\.quantidade \?\? body\.target_quantity/);
  assert.match(post, /body\.limite_candidatos \?\? body\.limite \?\? body\.search_limit/);
  assert.match(post, /regra: DISCOVERY_QUANTITY_RULE/);
  assert.match(post, /startsWith\("ssrf_"\) \? 400 : 503/, "destino bloqueado pela proteção SSRF precisa responder 400");
  const auth = post.slice(0, post.indexOf("if (root === \"leads\")"));
  assert.match(auth, /const auth = await context\(\); if \(!auth\) return out\(\{ error: "unauthorized" \}, 401\);/);
  assert.doesNotMatch(post, /fetch\(['"]https?:\/\//, "a rota não fala direto com a fonte; o motor de descoberta faz isso");
});

test("o CRM ganha a entrada de descoberta e a mantém no artefato publicado", () => {
  assert.match(poc, /function dsDescobrir\(\)/);
  assert.match(poc, /fetch\('\/api\/discovery'/);
  assert.match(poc, /function dsAdicionarDescobertos\(\)/);
  assert.match(poc, /function vDiscPainel\(\)/);
  assert.match(poc, /return vDiscPainel\(\)/);
  for (const campo of ["disc-nicho", "disc-cidade", "disc-quantidade", "disc-produto"]) {
    assert.ok(publicado.includes(`id="${campo}"`), `o CRM publicado precisa do campo ${campo}`);
  }
  assert.ok(publicado.includes('id="disc-limite"'), "o CRM publicado precisa do limite de candidatos explícito");
  assert.ok(publicado.includes("Quantidade alvo"), "a UI precisa distinguir quantidade alvo");
  assert.ok(publicado.includes("Limite de candidatos"), "a UI precisa distinguir limite de candidatos");
  assert.ok(publicado.includes("pode devolver até 25 empresas"), "a UI precisa declarar a regra do retorno");
  assert.ok(publicado.includes("Buscar empresas reais"), "o operador precisa disparar a busca real");
  assert.ok(publicado.includes("Adicionar ao CRM"), "o resultado precisa entrar no CRM sem copiar e colar");
  assert.ok(publicado.includes("dsDescobrir()"), "o botão precisa chamar a busca real");
});

test("a descoberta não embute empresa, fixture ou dado de exemplo no código", () => {
  const provider = ler("../lib/discovery/provider.js");
  assert.doesNotMatch(provider, /elements:\s*\[/, "o provedor não pode trazer resultado embutido");
  assert.doesNotMatch(provider, /McDonald|Starbucks|Pizza Hut|Empresa Exemplo/i);
  assert.match(provider, /fetchImpl = fetch/, "a fonte real precisa ser consultada de fato");
  assert.match(provider, /discovery_provider_unavailable/);
  assert.equal(DISCOVERY_MAX_LIMIT, 50);
});
