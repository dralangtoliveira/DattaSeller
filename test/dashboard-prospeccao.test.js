import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const artefato = ler("../public/dashboard.html");
const poc = ler("../poc/dattaseller-local/app/dashboard.html");

test("a prospecção é um formulário real, sem JSON para o operador", () => {
  for (const campo of ["cand-nome", "cand-cidade", "cand-telefone", "cand-email", "cand-site", "cand-instagram", "cand-contato", "cand-fonte"]) {
    assert.ok(artefato.includes(`id="${campo}"`), `o formulário precisa do campo ${campo}`);
  }
  assert.ok(artefato.includes("Adicionar à fila"), "o operador precisa adicionar candidatos por botão");
  assert.ok(artefato.includes("Salvar e deduplicar"), "a ação principal continua explícita");
  assert.match(poc, /function dsAddCand\(\)/, "a montagem do candidato vive no HTML base");
  assert.match(poc, /function dsSalvarCands\(\)/, "o envio vive no HTML base");
  assert.match(poc, /candidates:DS_CANDS/, "o payload segue o contrato de /api/prospects");
});

test("o antigo interceptador de JSON não controla mais a área de prospecção", () => {
  assert.ok(artefato.includes("setView=function(next){return normalSetView(next)}"), "a área de prospecção volta a usar a navegação canônica");
  const patch = ler("../scripts/production-dashboard-patch.mjs");
  assert.match(patch, /O interceptador antigo, que exigia colar JSON/, "a neutralização precisa estar registrada no patch");
});

test("a validade do candidato é checada antes de enfileirar", () => {
  assert.match(poc, /Informe nome\/empresa, cidade e a URL pública da fonte/, "faltou validar campos obrigatórios");
  assert.match(poc, /O nome informado não gera um identificador válido/, "faltou validar o identificador");
  assert.match(poc, /Nada foi persistido/, "falha de rede precisa falhar fechado");
});
