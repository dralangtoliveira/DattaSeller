/**
 * Teste funcional real do DS-VALUE-03.
 *
 * Abre o site público real do lead e imprime os fatos observados (resposta
 * HTTP, título, CTA, contatos publicados, viewport, imagens). Nenhuma fixture,
 * nenhuma credencial e nenhuma afirmação técnica sem teste.
 *
 * Uso:
 *   node scripts/diagnosis-smoke.mjs "https://empireszechuanfltogo.com/"
 */

import { DiagnosisError, diagnoseSite } from "../lib/diagnosis/site.js";

const url = process.argv[2] ?? "https://empireszechuanfltogo.com/";

try {
  const diagnostico = await diagnoseSite(url);
  console.log(JSON.stringify({ url: diagnostico.url, verificado_em: diagnostico.checked_at, fatos: diagnostico.fatos, evidencias: diagnostico.evidencias }, null, 2));
  console.error(`RESULTADO: diagnóstico factual de ${diagnostico.fatos.url_final} registrado com ${diagnostico.evidencias.length} evidência(s).`);
} catch (error) {
  const codigo = error instanceof DiagnosisError ? error.code : error?.name ?? "erro";
  console.error(`FALHA: ${codigo} — ${error?.message ?? error}`);
  process.exitCode = 1;
}
