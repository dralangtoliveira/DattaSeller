/**
 * DS-VALUE-01 — descoberta real de empresas por nicho + cidade.
 *
 * Fonte real (sem custo e sem credencial): OpenStreetMap, via Nominatim
 * (geocodificação da cidade) e Overpass API (busca de estabelecimentos).
 * Devolve somente o que a fonte pública informa: nada é inventado e campo
 * ausente volta vazio e marcado como indisponível.
 *
 * Paridade com o Prospector histórico (`docs/sources/prospector/`): a entrada
 * continua sendo nicho + cidade e a saída continua sendo empresa real com
 * origem, data de verificação e canal público — a diferença é que a busca
 * passa a ser executada pela própria linha web, sem digitação manual.
 */

export const DISCOVERY_PROVIDER_ID = "openstreetmap";
export const DISCOVERY_PROVIDER_LABEL = "OpenStreetMap (Nominatim + Overpass)";
export const DISCOVERY_LICENCE = "ODbL 1.0 — © colaboradores do OpenStreetMap";
export const DISCOVERY_DEFAULT_QUANTITY = 10;
export const DISCOVERY_DEFAULT_LIMIT = 25;
export const DISCOVERY_MAX_LIMIT = 50;

const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_CONTACT = "DattaSeller CRM (+https://crm.datta360.com.br)";
const DEFAULT_TIMEOUT_MS = 25000;

/** Chaves do OSM usadas como categoria/nicho da empresa. */
export const DISCOVERY_CATEGORY_KEYS = ["amenity", "shop", "office", "craft", "leisure", "healthcare", "tourism", "sport"];

export class DiscoveryError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "DiscoveryError";
    this.code = code;
    this.details = details;
  }
}

const text = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
const escapeRegex = (value) => String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

/**
 * Nicho conhecido → tag real do OpenStreetMap. Mantém a busca precisa
 * (a categoria é um fato da fonte) antes de cair na busca textual.
 */
const NICHE_FILTERS = [
  { termos: ["restaurante", "restaurant", "restaurantes", "comida", "alimentacao", "alimentação"], filtro: '["amenity"="restaurant"]', categoria: "amenity=restaurant" },
  { termos: ["pizzaria", "pizza", "pizzarias"], filtro: '["amenity"="restaurant"]["cuisine"~"pizza",i]', categoria: "amenity=restaurant" },
  { termos: ["lanchonete", "lanches", "hamburgueria", "burger", "fast food", "comida rapida"], filtro: '["amenity"="fast_food"]', categoria: "amenity=fast_food" },
  { termos: ["cafeteria", "cafe", "café", "cafes", "coffee"], filtro: '["amenity"="cafe"]', categoria: "amenity=cafe" },
  { termos: ["bar", "bares", "pub", "cervejaria"], filtro: '["amenity"~"^(bar|pub|biergarten)$"]', categoria: "amenity=bar" },
  { termos: ["padaria", "padarias", "confeitaria"], filtro: '["shop"~"^(bakery|pastry)$"]', categoria: "shop=bakery" },
  { termos: ["mercado", "supermercado", "mercearia", "hortifruti"], filtro: '["shop"~"^(supermarket|convenience|greengrocer)$"]', categoria: "shop=supermarket" },
  { termos: ["farmacia", "farmácia", "drogaria"], filtro: '["amenity"="pharmacy"]', categoria: "amenity=pharmacy" },
  { termos: ["salao de beleza", "salão de beleza", "salao", "salao de cabelo", "cabeleireiro", "beleza", "estetica", "estética", "estetica automotiva"], filtro: '["shop"~"^(beauty|hairdresser)$"]', categoria: "shop=beauty" },
  { termos: ["barbearia", "barbeiro", "barbershop"], filtro: '["shop"="hairdresser"]["male"="yes"]', categoria: "shop=hairdresser" },
  { termos: ["academia", "academias", "gym", "fitness", "crossfit", "pilates"], filtro: '["leisure"="fitness_centre"]', categoria: "leisure=fitness_centre" },
  { termos: ["dentista", "odontologia", "odonto", "clinica odontologica"], filtro: '["amenity"~"^(dentist|clinic)$"]["healthcare"~"dentist",i]', categoria: "amenity=dentist" },
  { termos: ["clinica", "clínica", "clinicas", "consultorio", "consultório"], filtro: '["amenity"="clinic"]', categoria: "amenity=clinic" },
  { termos: ["veterinaria", "veterinária", "veterinario", "pet vet"], filtro: '["amenity"="veterinary"]', categoria: "amenity=veterinary" },
  { termos: ["petshop", "pet shop", "pets", "banho e tosa"], filtro: '["shop"="pet"]', categoria: "shop=pet" },
  { termos: ["hotel", "hoteis", "pousada", "pousadas", "hostel", "motel"], filtro: '["tourism"~"^(hotel|guest_house|hostel|motel)$"]', categoria: "tourism=hotel" },
  { termos: ["advogado", "advogados", "advocacia", "juridico", "jurídico"], filtro: '["office"="lawyer"]', categoria: "office=lawyer" },
  { termos: ["contabilidade", "contador", "contadores", "escritorio contabil"], filtro: '["office"~"^(accountant|tax_advisor)$"]', categoria: "office=accountant" },
  { termos: ["imobiliaria", "imobiliária", "corretor", "corretora de imoveis"], filtro: '["office"="estate_agent"]', categoria: "office=estate_agent" },
  { termos: ["arquiteto", "arquitetura", "arquitetos"], filtro: '["office"="architect"]', categoria: "office=architect" },
  { termos: ["oficina", "oficina mecanica", "mecanica", "auto center", "funilaria"], filtro: '["shop"~"^(car_repair|tyres)$"]', categoria: "shop=car_repair" },
  { termos: ["lavanderia", "lavanderia self service"], filtro: '["shop"~"^(laundry|dry_cleaning)$"]', categoria: "shop=laundry" },
  { termos: ["escola", "escolas", "colegio", "colégio", "curso", "idiomas"], filtro: '["amenity"~"^(school|college|language_school)$"]', categoria: "amenity=school" },
  { termos: ["construcao", "construção", "construtora", "obra"], filtro: '["craft"~"^(builder|carpenter|roofer|electrician|plumber)$"]', categoria: "craft=builder" },
  { termos: ["fotografo", "fotógrafo", "fotografia", "estudio fotografico"], filtro: '["craft"="photographer"]', categoria: "craft=photographer" },
  { termos: ["floricultura", "florista", "flores"], filtro: '["shop"="florist"]', categoria: "shop=florist" },
  { termos: ["moveis", "móveis", "movelaria"], filtro: '["shop"="furniture"]', categoria: "shop=furniture" },
  { termos: ["roupas", "loja de roupas", "boutique", "moda"], filtro: '["shop"~"^(clothes|boutique)$"]', categoria: "shop=clothes" },
];

/**
 * Traduz o nicho informado pelo operador no seletor real do Overpass.
 * Nicho conhecido usa a tag correspondente; nicho desconhecido cai numa busca
 * textual explícita (categoria ou nome), sempre marcada para revisão humana.
 */
export function nicheSelector(nicho) {
  const term = text(nicho);
  if (!term) throw new DiscoveryError("discovery_invalid_query", "Informe o nicho da busca.");
  const known = NICHE_FILTERS.find((entry) => entry.termos.some((alias) => term === text(alias) || term.includes(text(alias))));
  if (known) return { strategy: "categoria", categoria: known.categoria, selector: `nwr${known.filtro}(bbox);`, warning: null, term };
  const pattern = escapeRegex(term);
  return {
    strategy: "texto",
    categoria: null,
    selector: `nwr[~"^(${DISCOVERY_CATEGORY_KEYS.join("|")})$"~"${pattern}",i](bbox);nwr["name"~"${pattern}",i](bbox);`,
    warning: "Nicho sem categoria mapeada: a busca usa o termo no nome e na categoria das empresas. Revise os resultados antes de usar.",
    term,
  };
}

/**
 * O Nominatim devolve o retângulo como [sul, norte, oeste, leste]; o Overpass
 * espera (sul, oeste, norte, leste). Trocar a ordem não é cosmético: a área
 * sairia errada e a busca devolveria outro lugar.
 */
export function overpassBbox(bbox) {
  const [south, north, west, east] = (bbox ?? []).map(Number);
  return [south, west, north, east];
}

export function buildOverpassQuery({ selector, bbox, limit, timeoutSeconds = 25 }) {
  if (!Array.isArray(bbox) || bbox.length !== 4 || bbox.some((value) => !Number.isFinite(Number(value)))) {
    throw new DiscoveryError("discovery_invalid_query", "Área de busca inválida.");
  }
  const [south, west, north, east] = bbox.map(Number);
  if (south > north || west > east) throw new DiscoveryError("discovery_invalid_query", "Área de busca inválida.");
  return `[out:json][timeout:${timeoutSeconds}];(${selector.replaceAll("(bbox)", `(${bbox.map(Number).join(",")})`)});out body center ${limit};`;
}

function addressOf(tags) {
  const street = clean(tags["addr:street"]);
  const number = clean(tags["addr:housenumber"]);
  const district = clean(tags["addr:suburb"] || tags["addr:district"] || tags["addr:neighbourhood"]);
  const city = clean(tags["addr:city"]);
  const state = clean(tags["addr:state"]);
  const postcode = clean(tags["addr:postcode"]);
  const line = clean([clean(`${street}${number ? `, ${number}` : ""}`), district, [city, state].filter(Boolean).join(", "), postcode].filter(Boolean).join(" · "));
  return line;
}

function categoryOf(tags) {
  for (const key of DISCOVERY_CATEGORY_KEYS) {
    const value = clean(tags[key]);
    if (value) return { categoria: value, categoria_fonte: `${key}=${value}`, chave: key };
  }
  return { categoria: "", categoria_fonte: "", chave: "" };
}

function instagramOf(tags) {
  const raw = clean(tags["contact:instagram"] || tags.instagram);
  if (!raw) return "";
  const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/+$/, "");
  return /^[A-Za-z0-9._]{2,40}$/.test(handle) ? `https://instagram.com/${handle}` : "";
}

function websiteOf(tags) {
  const raw = clean(tags.website || tags["contact:website"] || tags.url);
  if (!raw) return "";
  try {
    const url = new URL(/^https?:/i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/**
 * Converte um elemento do Overpass no registro de empresa da descoberta.
 * Campo ausente na fonte permanece vazio e entra em `campos_indisponiveis`.
 */
export function elementToResult(element, { checkedAt }) {
  const tags = element?.tags ?? {};
  const nome = clean(tags.name || tags["name:pt"] || tags["name:en"] || tags.brand);
  if (!nome) return null;
  const coordinates = element.type === "node" ? { lat: element.lat, lon: element.lon } : { lat: element.center?.lat, lon: element.center?.lon };
  const { categoria, categoria_fonte } = categoryOf(tags);
  const endereco = addressOf(tags);
  const telefone = clean(tags.phone || tags["contact:phone"] || tags["contact:mobile"]);
  const whatsapp = clean(tags["contact:whatsapp"]).replace(/\D/g, "");
  const site = websiteOf(tags);
  const email = clean(tags.email || tags["contact:email"]);
  const instagram = instagramOf(tags);
  const source_url = `https://www.openstreetmap.org/${element.type}/${element.id}`;
  const ausentes = [
    !endereco && "endereco",
    !telefone && "telefone",
    !site && "website",
    !email && "email",
    !categoria && "categoria",
  ].filter(Boolean);
  return {
    provider: DISCOVERY_PROVIDER_ID,
    provider_id: `${element.type}/${element.id}`,
    nome,
    categoria,
    categoria_fonte,
    endereco,
    cidade_fonte: clean(tags["addr:city"]),
    telefone,
    whatsapp,
    email,
    site,
    instagram,
    latitude: Number.isFinite(Number(coordinates.lat)) ? Number(coordinates.lat) : null,
    longitude: Number.isFinite(Number(coordinates.lon)) ? Number(coordinates.lon) : null,
    source_url,
    source_checked_at: checkedAt,
    campos_indisponiveis: ausentes,
    detalhes: Object.fromEntries(
      ["opening_hours", "cuisine", "brand", "operator", "healthcare", "description"]
        .filter((key) => tags[key])
        .map((key) => [key, clean(tags[key])])
    ),
  };
}

function isClosedOrDisused(tags) {
  return Object.keys(tags ?? {}).some((key) => key.startsWith("disused:") || key.startsWith("was:") || key === "disused" || key === "abandoned");
}

function timeoutSignal(milliseconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/**
 * Um provedor indisponível precisa falhar fechado: nenhum resultado parcial é
 * devolvido como se fosse verdade.
 */
async function callProvider({ url, init, fetchImpl, timeoutMs, label }) {
  const { signal, done } = timeoutSignal(timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, { ...init, signal });
  } catch (error) {
    if (error?.name === "AbortError") throw new DiscoveryError("discovery_provider_timeout", `A fonte pública (${label}) não respondeu dentro de ${Math.round(timeoutMs / 1000)}s.`);
    throw new DiscoveryError("discovery_provider_unavailable", `Não foi possível consultar a fonte pública (${label}).`);
  } finally {
    done();
  }
  if (!response?.ok) {
    throw new DiscoveryError("discovery_provider_unavailable", `A fonte pública (${label}) respondeu ${response?.status ?? "sem status"}.`, { status: response?.status ?? null });
  }
  const textBody = await response.text();
  try {
    return JSON.parse(textBody);
  } catch {
    throw new DiscoveryError("discovery_provider_error", `A fonte pública (${label}) devolveu uma resposta ilegível.`);
  }
}

const geocodeCache = new Map();
let lastGeocodeAt = 0;

export function resetGeocodeCache() {
  geocodeCache.clear();
  lastGeocodeAt = 0;
}

/**
 * Geocodifica a cidade/região informada pelo operador. Usa o cache para não
 * repetir a consulta e respeita a política de uso do Nominatim (1 req/s).
 */
export async function geocodePlace(cidade, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, contact = DEFAULT_CONTACT, url = process.env.DATTASELLER_DISCOVERY_NOMINATIM_URL || DEFAULT_NOMINATIM_URL } = {}) {
  const query = clean(cidade);
  if (!query) throw new DiscoveryError("discovery_invalid_query", "Informe a cidade/região da busca.");
  const cached = geocodeCache.get(text(query));
  if (cached && Date.now() - cached.at < 600000) return cached.place;
  const wait = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastGeocodeAt = Date.now();
  const endpoint = new URL(url);
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "1");
  const payload = await callProvider({ url: endpoint.toString(), init: { headers: { "User-Agent": contact, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" } }, fetchImpl, timeoutMs, label: "Nominatim" });
  const match = Array.isArray(payload) ? payload[0] : null;
  const bbox = (match?.boundingbox ?? []).map(Number);
  if (!match || bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
    throw new DiscoveryError("discovery_place_not_found", `A localidade "${query}" não foi encontrada na fonte pública.`, { query });
  }
  const place = { nome: clean(match.display_name), tipo: clean(match.type), bbox, latitude: Number(match.lat), longitude: Number(match.lon), provider_id: `${match.osm_type ?? "relation"}/${match.osm_id ?? ""}` };
  geocodeCache.set(text(query), { at: Date.now(), place });
  return place;
}

function normalizeLimit(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(Math.floor(number), DISCOVERY_MAX_LIMIT);
}

/** Quantos campos úteis a fonte realmente informou para essa empresa. */
export function completeness(result) {
  return ["telefone", "site", "email", "instagram", "endereco"].filter((field) => (field === "endereco" ? result?.endereco : result?.[field])).length;
}

/**
 * Busca real: nicho + cidade → empresas reais com origem e data de verificação.
 */
export async function discoverCompanies({
  nicho,
  cidade,
  quantidade = DISCOVERY_DEFAULT_QUANTITY,
  limite = DISCOVERY_DEFAULT_LIMIT,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  contact = process.env.DATTASELLER_DISCOVERY_CONTACT || DEFAULT_CONTACT,
  overpassUrl = process.env.DATTASELLER_DISCOVERY_OVERPASS_URL || DEFAULT_OVERPASS_URL,
  place = null,
  now = () => new Date(),
} = {}) {
  const alvo = Math.max(1, Math.min(Number(quantidade) || DISCOVERY_DEFAULT_QUANTITY, DISCOVERY_MAX_LIMIT));
  const teto = Math.max(alvo, normalizeLimit(limite, DISCOVERY_DEFAULT_LIMIT));
  const { strategy, categoria, selector, warning } = nicheSelector(nicho);
  const resolved = place ?? (await geocodePlace(cidade, { fetchImpl, timeoutMs, contact }));
  // Busca uma amostra maior que o pedido e prioriza os registros com contato
  // público: a fonte varia muito de completude e o operador precisa de canal.
  const amostra = Math.min(DISCOVERY_MAX_LIMIT, Math.max(teto, alvo * 2, 20));
  const query = buildOverpassQuery({ selector, bbox: overpassBbox(resolved.bbox), limit: amostra });
  const payload = await callProvider({
    url: overpassUrl,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": contact, Accept: "application/json" },
      body: new URLSearchParams({ data: query }).toString(),
    },
    fetchImpl,
    timeoutMs,
    label: "Overpass",
  });
  if (payload?.remark) throw new DiscoveryError("discovery_provider_error", `A fonte pública recusou a consulta: ${clean(payload.remark)}`);
  const elements = Array.isArray(payload?.elements) ? payload.elements : null;
  if (!elements) throw new DiscoveryError("discovery_provider_error", "A fonte pública devolveu uma resposta sem resultados.");
  const checkedAt = now().toISOString();
  const seen = new Set();
  const results = [];
  let semNome = 0;
  let desativados = 0;
  for (const element of elements) {
    const tags = element?.tags ?? {};
    if (isClosedOrDisused(tags)) { desativados += 1; continue; }
    const result = elementToResult(element, { checkedAt });
    if (!result) { semNome += 1; continue; }
    if (seen.has(result.provider_id)) continue;
    seen.add(result.provider_id);
    results.push(result);
  }
  results.sort((a, b) => completeness(b) - completeness(a) || a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    provider: DISCOVERY_PROVIDER_ID,
    provider_label: DISCOVERY_PROVIDER_LABEL,
    provider_url: overpassUrl,
    licence: DISCOVERY_LICENCE,
    strategy,
    categoria_mapeada: categoria,
    warning,
    query: { nicho: clean(nicho), cidade: clean(cidade), quantidade: alvo, limite: teto },
    place: resolved,
    searched_at: checkedAt,
    considerados: elements.length,
    ignorados: { sem_nome: semNome, desativados },
    results: results.slice(0, teto),
  };
}
