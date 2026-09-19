/**
 * Teste funcional real do DS-VALUE-01.
 *
 * Executa a descoberta de verdade contra a fonte pública (Nominatim + Overpass)
 * e imprime o que foi devolvido. Não usa fixture, não usa mock e não imprime
 * credencial nenhuma — o provedor padrão não exige chave.
 *
 * Uso:
 *   node scripts/discovery-smoke.mjs "restaurante" "Orlando, FL" 5
 */

import { DISCOVERY_PROVIDER_LABEL, DiscoveryError, discoverCompanies } from "../lib/discovery/provider.js";
import { resultsToCandidates } from "../lib/discovery/candidates.js";

const [nicho = "restaurante", cidade = "Orlando, FL", quantidade = "5"] = process.argv.slice(2);
const alvo = Math.max(1, Number(quantidade) || 5);

try {
  const busca = await discoverCompanies({ nicho, cidade, quantidade: alvo, limite: Math.max(alvo, 10) });
  const candidatos = resultsToCandidates(busca.results, { nicho, cidade });
  const exemplos = candidatos.slice(0, 5).map((candidato) => ({
    slug: candidato.slug,
    nome: candidato.nome,
    categoria: candidato.proveniencia.categoria || null,
    endereco: candidato.proveniencia.endereco || null,
    telefone: candidato.telefone || null,
    website: candidato.site_antigo || null,
    fonte: candidato.source_url,
    campos_indisponiveis: candidato.proveniencia.campos_indisponiveis,
  }));
  console.log(JSON.stringify({
    provider: busca.provider,
    provider_label: DISCOVERY_PROVIDER_LABEL,
    licence: busca.licence,
    strategy: busca.strategy,
    categoria_mapeada: busca.categoria_mapeada,
    warning: busca.warning,
    consulta: busca.query,
    localidade: busca.place?.nome ?? null,
    area: busca.place?.bbox ?? null,
    verificado_em: busca.searched_at,
    considerados: busca.considerados,
    ignorados: busca.ignorados,
    retornadas: candidatos.length,
    exemplos,
  }, null, 2));
  if (!candidatos.length) {
    console.error("RESULTADO: nenhuma empresa real encontrada para a consulta.");
    process.exitCode = 2;
  } else {
    console.error(`RESULTADO: ${candidatos.length} empresa(s) real(is) devolvida(s) pela fonte pública.`);
  }
} catch (error) {
  const codigo = error instanceof DiscoveryError ? error.code : error?.name ?? "erro";
  console.error(`FALHA: ${codigo} — ${error?.message ?? error}`);
  process.exitCode = 1;
}
