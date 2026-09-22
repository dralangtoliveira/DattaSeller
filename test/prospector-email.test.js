import test from "node:test";
import assert from "node:assert/strict";
import { buildProspectorDraft, validateProspectorDraft } from "../lib/email/prospector-draft.js";

test("gera rascunho Prospector com pergunta, 120-180 palavras e link único", () => {
  const draft = buildProspectorDraft({ businessName: "Empresa Exemplo", firstLine: "Vi a apresentação pública da Empresa Exemplo e gostei da forma como vocês explicam o atendimento.", diagnosis: ["O contato está publicado, mas a chamada principal não aparece logo no início.", "A página tem informações úteis, porém a hierarquia pode deixar o serviço mais fácil de entender."], publicUrl: "https://propostas.example.com/p/abc", sellerName: "Ana", identity: "DattaSeller", whatsapp: "+5511999999999" });
  assert.equal(validateProspectorDraft({ ...draft, publicUrl: "https://propostas.example.com/p/abc" }), null);
  assert.ok(draft.subject.endsWith("?"));
});

test("a checklist bloqueia gatilhos, mais de um link e texto fora do tamanho", () => {
  assert.equal(validateProspectorDraft({ subject: "Oferta urgente?", body: "https://a.example https://b.example", publicUrl: "https://a.example" }), "prospector_word_count_invalid");
  const body = `${Array.from({ length: 130 }, () => "texto").join(" ")} https://a.example`;
  assert.equal(validateProspectorDraft({ subject: "Empresa, posso mostrar algo?", body, publicUrl: "https://c.example" }), "prospector_link_invalid");
});
