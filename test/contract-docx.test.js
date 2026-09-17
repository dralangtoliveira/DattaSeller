import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contractDocxFilename, contractDocxMime, renderContractDocx } from "../lib/contracts/docx.js";

function readStoredEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let at = bytes.length - 22; at >= 0; at -= 1) if (view.getUint32(at, true) === 0x06054b50) { end = at; break; }
  assert.notEqual(end, -1, "EOCD ausente: o pacote não é um ZIP válido");
  const entries = new Map();
  let at = view.getUint32(end + 16, true);
  for (let index = 0; index < view.getUint16(end + 10, true); index += 1) {
    assert.equal(view.getUint32(at, true), 0x02014b50, "cabeçalho do diretório central inválido");
    const size = view.getUint32(at + 20, true), nameLength = view.getUint16(at + 28, true), extraLength = view.getUint16(at + 30, true), commentLength = view.getUint16(at + 32, true), offset = view.getUint32(at + 42, true);
    assert.equal(view.getUint32(offset, true), 0x04034b50, "cabeçalho local inválido");
    assert.equal(view.getUint16(offset + 8, true), 0, "o DOCX gerado deve usar entradas armazenadas e determinísticas");
    assert.equal(view.getUint32(offset + 14, true), view.getUint32(at + 16, true), "CRC divergente entre cabeçalho local e diretório central");
    const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
    entries.set(new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength)), new TextDecoder().decode(bytes.subarray(start, start + size)));
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

test("o contrato gera um pacote DOCX OOXML válido sem dependência externa", () => {
  const file = renderContractDocx({ clientName: "Curtume Tropical", company: "Curtume Tropical LTDA", city: "Novo Hamburgo", offerName: "Datta360°", currency: "BRL", value: 1500, terms: "Condição A\nCondição B", status: "generated", sellerName: "Operador Local", generatedAt: "2026-09-16T12:00:00.000Z", reference: "contract_1" });
  assert.ok(file instanceof Uint8Array);
  assert.equal(new TextDecoder().decode(file.subarray(0, 4)), "PK\u0003\u0004");
  const entries = readStoredEntries(file);
  assert.deepEqual([...entries.keys()], ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]);
  assert.match(entries.get("[Content_Types].xml"), /wordprocessingml\.document\.main\+xml/);
  assert.match(entries.get("_rels/.rels"), /Target="word\/document\.xml"/);
  const document = entries.get("word/document.xml");
  assert.match(document, /^<\?xml version="1\.0" encoding="UTF-8" standalone="yes"\?>/);
  for (const expected of ["Contrato de prestação de serviços", "Cliente: Curtume Tropical", "Empresa: Curtume Tropical LTDA", "Oferta: Datta360°", "Valor: BRL 1500.00", "Condição A", "Condição B", "Situação: generated", "Operador Local", "Emitido em 2026-09-16", "Referência contract_1", "Revisão humana obrigatória"]) assert.ok(document.includes(expected), `documento sem "${expected}"`);
  assert.match(document, /<w:t xml:space="preserve">/);
  assert.match(document, /<w:sectPr>/);
});

test("o DOCX escapa conteúdo do lead, falha fechada no vazio e usa nome de arquivo seguro", () => {
  const file = renderContractDocx({ clientName: '<script>alert("x")</script>', offerName: "Oferta & Cia", currency: "BRL", value: "10.5", terms: "   ", status: "sent_simulated" });
  const document = readStoredEntries(file).get("word/document.xml");
  assert.doesNotMatch(document, /<script>/);
  assert.match(document, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(document, /Oferta &amp; Cia/);
  assert.match(document, /Valor: BRL 10\.50/);
  assert.match(document, /Condições: a confirmar/);
  assert.equal(contractDocxFilename("contract_1"), "contrato-contract_1.docx");
  assert.equal(contractDocxFilename("../../etc/passwd"), "contrato-etcpasswd.docx");
  assert.equal(contractDocxFilename(""), "contrato-dattaseller.docx");
  assert.equal(contractDocxMime, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
});

test("a linha web serve o DOCX do contrato em vez de cair no handler genérico", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(route, /parts\[2\] === "docx"/);
  assert.match(route, /renderContractDocx\(/);
  assert.match(route, /contractDocxFilename\(/);
  assert.match(route, /contract_not_found/);
  assert.match(route, /ds_products\(is_demo,terms\)/);
  assert.match(route, /demo_product_contract_forbidden/);
  assert.ok(route.indexOf('parts[2] === "docx"') < route.indexOf("if (tables[root])"), "o DOCX precisa ser resolvido antes do handler genérico de tabelas");
});
