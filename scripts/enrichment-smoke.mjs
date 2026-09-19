/**
 * Teste funcional real do DS-VALUE-02.
 *
 * Enriquece um lead incompleto de verdade: consulta o site público do próprio
 * lead e o registro público do OpenStreetMap. Nenhuma fixture, nenhuma chave de
 * API e nenhum dado inventado — o que não existe na fonte simplesmente não sai.
 *
 * Uso:
 *   node scripts/enrichment-smoke.mjs "Empire Szechuan" "Orlando, FL" "https://empireszechuanfltogo.com/"
 */

import { EnrichmentError, enrichLead, planEnrichmentUpdate } from "../lib/enrichment/provider.js";

const [nome = "Empire Szechuan", cidade = "Orlando, FL", site = "https://empireszechuanfltogo.com/"] = process.argv.slice(2);
const lead = { slug: "smoke-enrichment", nome, cidade, site_antigo: site, telefone: "(407) 555-0000" };

try {
  const resultado = await enrichLead({ lead });
  const { updates, ignored } = planEnrichmentUpdate(lead, resultado.fields);
  console.log(JSON.stringify({
    lead: { nome, cidade, site_antigo: site, telefone_preexistente: lead.telefone },
    verificado_em: resultado.checked_at,
    fontes: resultado.sources.map((origem) => ({ source: origem.source, source_url: origem.source_url, ok: origem.ok, detalhe: origem.page?.title ?? origem.match?.nome ?? null })),
    avisos: resultado.warnings,
    campos_encontrados: Object.fromEntries(Object.entries(resultado.fields).map(([field, evidence]) => [field, {
      valor: evidence.value,
      fonte: evidence.source,
      source_url: evidence.source_url,
      verificado_em: evidence.checked_at,
      confianca: evidence.confidence,
      classificacao: evidence.classification,
    }])),
    aplicaria: Object.keys(updates),
    preservaria: ignored,
  }, null, 2));
  if (!Object.keys(resultado.fields).length) {
    console.error("RESULTADO: nenhuma fonte pública informou dado novo para este lead.");
    process.exitCode = 2;
  } else {
    console.error(`RESULTADO: ${Object.keys(updates).length} campo(s) enriquecido(s) e ${ignored.length} preservado(s).`);
  }
} catch (error) {
  const codigo = error instanceof EnrichmentError ? error.code : error?.name ?? "erro";
  console.error(`FALHA: ${codigo} — ${error?.message ?? error}`);
  process.exitCode = 1;
}
