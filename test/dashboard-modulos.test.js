import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Regressão de interface: nenhuma geração/patch futuro pode remover um módulo
 * canônico da aplicação web. A referência visual operacional é
 * public/dashboard.html (artefato web servido em /dashboard.html); o arquivo em
 * poc/dattaseller-local/app/dashboard.html é a POC/base histórica que alimenta a
 * sincronização.
 */

const BASE = process.env.UI_BASELINE_REF ?? "origin/hardening/phase-a-containment-clean";
const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const poc = ler("../poc/dattaseller-local/app/dashboard.html");
const publicado = ler("../public/dashboard.html");
const patch = ler("../scripts/production-dashboard-patch.mjs");
const sync = ler("../scripts/sync-dashboard.mjs");

const MODULOS = [
  ["geral", "Visão geral", "vGeral"],
  ["prospeccao", "Prospecção", "vProspeccao"],
  ["pipeline", "Pipeline", "vPipeline"],
  ["clientes", "Clientes", "vClientes"],
  ["intelligence", "Inteligência", "vIntelligence"],
  ["workspace", "Central comercial", "vWorkspace"],
  ["timeline", "Timeline", "vTimeline"],
  ["sites", "Sites / Preview", "vSites"],
  ["comparador", "Comparador", "vComparador"],
  ["followup", "Follow-ups", "vFollowup"],
  ["contratos", "Contratos", "vContractsLocal"],
  ["financeiro", "Financeiro", "vFinanceiroLocal"],
  ["config", "Configurações", "vConfigLocal"],
];

const semAcento = (texto) => String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const navDe = (html) => {
  const bloco = /var NAV_CANONICO=\[([\s\S]*?)\];/.exec(html);
  assert.ok(bloco, "o artefato precisa expor a navegação canônica (NAV_CANONICO)");
  return [...bloco[1].matchAll(/\['([a-z0-9]+)','([^']+)'\]/g)].map((m) => ({ id: m[1], rotulo: m[2] }));
};
const viewsDe = (html) => {
  const bloco = /var views=\{([\s\S]*?)\};/.exec(html);
  assert.ok(bloco, "o render precisa declarar o mapa de views");
  return Object.fromEntries([...bloco[1].matchAll(/([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)/g)].map((m) => [m[1], m[2]]));
};
const funcoesDe = (html) => new Set([...html.matchAll(/function ([a-zA-Z0-9_]+)\s*\(/g)].map((m) => m[1]));

for (const [arquivo, html] of [["public/dashboard.html (web)", publicado], ["poc/dattaseller-local/app/dashboard.html (POC)", poc]]) {
  test(`${arquivo}: todos os módulos canônicos continuam no menu, nas views e nos handlers`, () => {
    const nav = navDe(html);
    const views = viewsDe(html);
    const funcoes = funcoesDe(html);
    for (const [id, rotulo, handler] of MODULOS) {
      const item = nav.find((entrada) => entrada.id === id);
      assert.ok(item, `o menu perdeu o módulo ${id}`);
      assert.equal(semAcento(item.rotulo), semAcento(rotulo), `o rótulo do módulo ${id} mudou`);
      assert.equal(views[id], handler, `a view do módulo ${id} precisa continuar apontando para ${handler}`);
      assert.ok(funcoes.has(handler), `o handler ${handler} do módulo ${id} desapareceu`);
    }
    assert.equal(nav.length, MODULOS.length, "o menu não pode ganhar ou perder módulo fora da lista canônica");
  });
}

test("a interface publicada mantém as capacidades que já existiam antes dos gates", () => {
  // Entrada em lote herdada ("Pesquisa pública assistida") — não pode sumir.
  assert.ok(publicado.includes('id="prospect-candidates"'), "a importação JSON de candidatos públicos desapareceu");
  assert.match(publicado, /onclick="dsProspect\(\)"/, "o botão da importação JSON desapareceu");
  assert.ok(publicado.includes("Salvar e deduplicar"), "a ação de salvar/deduplicar a lista importada desapareceu");
  assert.match(publicado, /window\.dsProspect=function\(\)|window\.dsProspect = function\(\)/, "a implementação web da importação JSON desapareceu do patch");
  // Ações de operação que já existiam na Central comercial / clientes.
  for (const marcador of ["dsQuickEmail", "abrirEdit", "deletar", "dsSocialVisual", "dsCreateProposal", "vOrders", "vFinanceiroLocal", "vContractsLocal"]) {
    assert.ok(publicado.includes(marcador), `a ação ${marcador} desapareceu do artefato publicado`);
  }
});

test("descoberta, enriquecimento e diagnóstico entram como acréscimo, no lugar certo", () => {
  // Prospecção: formulário de descoberta + candidato manual + import JSON legado, juntos.
  for (const id of ["disc-nicho", "disc-cidade", "disc-quantidade", "disc-limite", "disc-produto", "cand-nome", "prospect-candidates"]) {
    assert.ok(publicado.includes(`id="${id}"`), `a área de Prospecção perdeu o campo ${id}`);
  }
  assert.match(publicado, /onclick="dsDescobrir\(\)"/, "a ação de descoberta real desapareceu");
  assert.match(publicado, /onclick="dsAdicionarDescobertos\(\)"/, "a ação de adicionar descobertos ao CRM desapareceu");
  assert.match(publicado, /onclick="dsAddCand\(\)"/, "a ação de candidato manual desapareceu");
  // Enriquecimento e diagnóstico entram por ação de lead, não substituindo módulo.
  assert.match(patch, /dsEnriquecer\(decodeURIComponent/, "a ação de enriquecimento desapareceu das ações do lead");
  assert.match(patch, /dsDiagnostico\(decodeURIComponent/, "a ação de diagnóstico desapareceu das ações do lead");
  assert.match(publicado, /function dsEnriquecer\(slug\)/, "a função de enriquecimento desapareceu");
  assert.match(publicado, /function dsDiagnostico\(slug\)/, "a função de diagnóstico desapareceu");
  assert.match(publicado, /function vDiscPainel\(\)/, "o painel de descoberta desapareceu");
  assert.match(publicado, /return vDiscPainel\(\)/, "a descoberta precisa continuar dentro da view de Prospecção");
});

test("a POC alimenta a web: sincronização e patch continuam explícitos no build", () => {
  assert.match(sync, /poc\/dattaseller-local\/app\/dashboard\.html/, "a sincronização precisa declarar a POC como origem");
  assert.match(sync, /public\/dashboard\.html/, "a sincronização precisa declarar o artefato web como destino");
  assert.match(patch, /export function applyProductionDashboardPatch/, "o patch de produção precisa existir");
  assert.match(patch, /navegação canônica perdeu a área/, "o patch precisa falhar fechado se uma área canônica desaparecer");
  assert.match(patch, /requireTarget\(html, "var NAV_CANONICO=\["/, "o patch precisa exigir a navegação canônica");
});

test("nenhum módulo canônico existente na base foi removido pelo HEAD", (t) => {
  const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 40 * 1024 * 1024, cwd: process.cwd(), stdio: ["ignore", "pipe", "ignore"] });
  try {
    git(["rev-parse", "--verify", "--quiet", `${BASE}^{commit}`]);
  } catch {
    t.skip(`base ${BASE} não está disponível neste clone`);
    return;
  }
  const base = git(["show", `${BASE}:public/dashboard.html`]);
  const navBase = navDe(base);
  const navHead = navDe(publicado);
  const removidos = navBase.filter((entrada) => !navHead.some((item) => item.id === entrada.id));
  assert.deepEqual(removidos, [], `módulos removidos em relação à base ${BASE}`);
  const funcoesBase = funcoesDe(base);
  const funcoesHead = funcoesDe(publicado);
  const handlersRemovidos = MODULOS.map(([, , handler]) => handler).filter((handler) => funcoesBase.has(handler) && !funcoesHead.has(handler));
  assert.deepEqual(handlersRemovidos, [], "handlers de módulo existentes na base desapareceram no HEAD");
});
