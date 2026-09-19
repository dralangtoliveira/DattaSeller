import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { syncDashboardHtml } from "../scripts/sync-dashboard.mjs";
import { applyProductionDashboardPatch } from "../scripts/production-dashboard-patch.mjs";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const normalizar = (texto) => texto.replace(/\r\n/g, "\n");

const poc = ler("../poc/dattaseller-local/app/dashboard.html");
const patchFonte = ler("../scripts/production-dashboard-patch.mjs");
const gerado = normalizar(applyProductionDashboardPatch(syncDashboardHtml(poc)));
const publicado = normalizar(ler("../public/dashboard.html"));

// Áreas canônicas já entregues. O menu não pode perder nenhuma delas — foi
// exatamente esse o bug: a segunda lista do patch removia "Contratos".
const NAV_REQUERIDA = [
  ["geral", "Visão geral"], ["prospeccao", "Prospecção"], ["pipeline", "Pipeline"], ["clientes", "Clientes"],
  ["intelligence", "Inteligência"], ["workspace", "Central comercial"], ["timeline", "Timeline"], ["sites", "Sites / Preview"],
  ["comparador", "Comparador"], ["followup", "Follow-ups"], ["contratos", "Contratos"], ["financeiro", "Financeiro"],
  ["config", "Configurações"],
];

// Executa a navegação REAL do artefato (NAV_CANONICO + navContagens + navItens + nav)
// num sandbox com DOM mínimo, para comparar a estrutura antes e depois da carga.
function executarNavegacao(html, { leads = [], previews = 0, contratos = 0, followupDias = 10 } = {}) {
  const inicio = html.indexOf("var NAV_CANONICO=[");
  const fim = html.indexOf("function pillStatus", inicio);
  assert.ok(inicio > 0 && fim > inicio, "o artefato precisa expor a navegação canônica");
  const bloco = html.slice(inicio, fim);

  const elementos = {};
  const DS = { settings: { followup_days: 4 }, previews: Array.from({ length: previews }, () => ({ lead_slug: "x" })), contracts: Array.from({ length: contratos }, () => ({ id: "c" })) };
  const contexto = {
    leads,
    DS,
    view: "geral",
    window: { DS },
    fil: () => leads,
    ativos: () => leads,
    dias: () => followupDias,
    document: { getElementById: (id) => (elementos[id] = elementos[id] ?? { innerHTML: "", textContent: "" }) },
  };

  vm.createContext(contexto);
  vm.runInContext(bloco, contexto);
  const itens = contexto.navItens();
  contexto.nav();
  const botoes = [...String(elementos.nav.innerHTML).matchAll(/setView\('([^']+)'\)">([^<]+)/g)].map((m) => [m[1], m[2]]);
  return { itens, botoes, titulo: elementos.titulo.textContent };
}

test("A/B — a navegação tem os mesmos itens e a mesma estrutura antes e depois da sincronização", () => {
  const antes = executarNavegacao(gerado, {});
  const depois = executarNavegacao(gerado, { leads: Array.from({ length: 3 }, () => ({ slug: "lead", status: "proposta" })), previews: 2, contratos: 1 });
  // Array.from converte a lista do sandbox (outro realm) numa lista local, para
  // que a comparação estrutural não dependa do protótipo do vm.
  const semContagem = (itens) => Array.from(itens, (i) => [i[0], i[1], i[2] === null ? null : "contagem"]);

  assert.deepEqual(semContagem(antes.itens), semContagem(depois.itens), "o conjunto e a ordem dos itens não podem mudar com a carga");
  assert.deepEqual(antes.botoes, depois.botoes, "o menu renderizado precisa ser idêntico antes e depois");
  assert.deepEqual(antes.botoes, NAV_REQUERIDA, "o menu precisa cobrir todas as áreas canônicas já entregues");
  assert.equal(antes.titulo, "Visão geral");
  assert.equal(depois.titulo, "Visão geral");
});

test("B — nenhuma área canônica pode desaparecer do menu", () => {
  const { itens } = executarNavegacao(gerado, {});
  for (const [id] of NAV_REQUERIDA) {
    assert.ok(itens.some((item) => item[0] === id), `a área ${id} desapareceu do menu`);
  }
  assert.equal(itens.length, NAV_REQUERIDA.length, "o menu não pode ganhar item manual fora da lista canônica");
  assert.ok(itens.some((item) => item[0] === "contratos"), "Contratos não pode ser removido por um patch de navegação");
});

test("C — existe uma única fonte de navegação no artefato gerado", () => {
  assert.equal((gerado.match(/var NAV_CANONICO=\[/g) ?? []).length, 1, "apenas uma lista canônica");
  assert.equal((gerado.match(/function nav\(/g) ?? []).length, 1, "apenas uma definição de nav()");
  assert.doesNotMatch(gerado, /nav=function/, "o patch não pode sobrescrever nav() com uma segunda lista");
  assert.doesNotMatch(gerado, /var itens=\[/, "nenhuma lista de menu pode ser declarada dentro de nav()");
  assert.doesNotMatch(patchFonte, /nav=function/, "o patch de produção precisa consumir a lista canônica, não recriá-la");
  assert.match(patchFonte, /requireTarget\(html, "var NAV_CANONICO=\["/, "o build precisa falhar se a fonte canônica desaparecer");
  assert.match(patchFonte, /navegação canônica perdeu a área/, "o runtime precisa falhar fechado se uma área canônica desaparecer");
});

test("D — o boot não exibe dado local/fixture nem menu divergente", () => {
  assert.doesNotMatch(gerado, /render\(\);dsLoad\(\);/, "o boot da POC não pode voltar");
  assert.match(gerado, /nav\(\);document\.getElementById\("view"\)\.innerHTML="<div class=\\"painel\\"><h2>Sincronizando com o servidor<\/h2>/, "o boot precisa mostrar o estado de sincronização");
  assert.match(gerado, /\{"atualizado":"","leads":\[\]\}/, "o artefato publicado não pode embarcar fixture de leads");
  assert.match(gerado, /localStorage\.removeItem\('prospector_ov'\)/, "o boot do CRM precisa descartar o override local da POC");
  assert.ok(gerado.includes("MODO DEMONSTRAÇÃO/g,''"), "o render precisa limpar o marcador MODO DEMONSTRAÇÃO");
  assert.ok(gerado.includes("/MODO (DEMO|LOCAL)/g,''"), "o render precisa limpar os marcadores MODO DEMO/LOCAL");
  assert.match(gerado, /<span>CRM comercial<\/span>/, "o logo não pode dizer 'operação comercial local'");
});

test("o artefato publicado é exatamente o gerado pela sincronização + patch", () => {
  assert.equal(publicado, gerado, "public/dashboard.html precisa ser regenerado por sync-dashboard + production-dashboard-patch");
});
