# Evidência — DS-VALUE-01 · Descoberta real de leads

**Data:** 2026-09-19
**Branch:** `codex/ds-value-01-discovery` (base `hardening/phase-a-containment-clean`)
**Gate:** DS-VALUE-01 — descoberta de empresas por nicho + cidade
**Status declarado:** `PROVEN_REAL`

## 1. O que passou a existir

Antes: a área **Prospecção** do CRM só aceitava candidato já encontrado (formulário
manual ou JSON). O CRM não descobria nada.

Agora: o operador informa **nicho + cidade/região + quantidade** e a linha web
executa uma busca real em fonte pública, com proveniência por empresa.

| Camada | Arquivo | Função |
| --- | --- | --- |
| Provedor real | `lib/discovery/provider.js` | geocodifica a cidade (Nominatim) e busca estabelecimentos (Overpass/OpenStreetMap); normaliza nicho → tag real; falha fechado |
| Ponte para o CRM | `lib/discovery/candidates.js` | converte o resultado em candidato aceito por `/api/prospects`, com slug único e sem sobrescrever lead existente |
| API | `app/api/[...path]/route.ts` (`POST /api/discovery`) | descoberta autenticada, deduplicação contra os leads reais e erro 503 sem resultado parcial |
| Interface | `poc/dattaseller-local/app/dashboard.html` + `public/dashboard.html` | formulário "Descoberta real", tabela de empresas reais, seleção e "Adicionar ao CRM" (sem copiar e colar) |
| Prova | `scripts/discovery-smoke.mjs`, `scripts/discovery-e2e-local.mjs`, `test/discovery.test.js` | teste real de rede e teste funcional pela linha web |

## 2. Teste funcional real (rede, fonte pública)

Consulta executada: **nicho `restaurante` · cidade `Orlando, FL` · quantidade 5**

```text
node scripts/discovery-smoke.mjs "restaurante" "Orlando, FL" 5
provider: openstreetmap (Nominatim + Overpass) · licença ODbL 1.0
localidade resolvida: Orlando, Condado de Orange, Flórida, Estados Unidos
considerados na fonte: 20 · retornadas: 10
exemplos reais:
  Jam'Eng Restaurant              telefone +14072864045 · North Orange Avenue, 65 · Orlando, FL · 32801 · https://www.openstreetmap.org/node/940689500
  Fat Rosie's Taco & Tequila Bar  telefone +1 689-266-0444 · https://www.fatrosies.com/location/waterford-lakes/ · https://www.openstreetmap.org/node/594968524
  Fratelli's Italian Restaurant   telefone +1-407-422-5500 · https://getsauce.com/order/site/fratellis-italian-restaurant · https://www.openstreetmap.org/node/940735085
  Empire Szechuan                 https://empireszechuanfltogo.com/ · https://www.openstreetmap.org/node/940735101
  Grand Roopram Roti Restaurant   https://www.grandroopramrotirestaurant.com/ · https://www.openstreetmap.org/node/938288825
```

## 3. Teste funcional pela linha web (HTTP real)

```text
node scripts/discovery-e2e-local.mjs
```

O CRM local (Next dev) sobe apontado para um **stub Supabase em memória** — nenhuma
base real é tocada, e o script aborta antes de escrever se a base de teste não
estiver vazia ou se o stub não receber a leitura de leads. O provedor **não** é
simulado: a busca é a mesma consulta real acima.

Resultado da execução:

- `POST /api/discovery` → 200, `provider: openstreetmap`, `strategy: categoria`, 24 empresas reais devolvidas para seleção;
- `POST /api/prospects` com os resultados selecionados → 3 leads criados (`jam-eng-restaurant`, `denny-s`, `fat-rosie-s-taco-tequila-bar`);
- segunda passada dos mesmos candidatos → `deduplicated: true` nos três, critério `telefone` (não duplica);
- `GET /api/leads` → leads persistidos com `source: openstreetmap`, `source_url` do elemento de origem, `source_checked_at` e `contact_evidence`.

## 4. Critérios do gate

| Critério | Como está atendido |
| --- | --- |
| usuário informa nicho | campo `Nicho` na área Prospecção |
| usuário informa cidade/localidade | campo `Cidade / região` (geocodificada na fonte) |
| busca real | Overpass/Nominatim reais, sem mock, sem fixture |
| empresas reais | nomes, endereços, telefones e sites reais do OpenStreetMap |
| resultado utilizável no fluxo | seleção → `/api/prospects` → lead no pipeline, sem copiar e colar |
| proveniência | `source`, `source_url` (elemento OSM), `source_checked_at`, `contact_evidence`, categoria da fonte em `obs` |
| deduplicação | conferida contra `ds_leads` antes de exibir e reconfirmada no servidor ao salvar |
| falha fechado | provedor indisponível/timeout/sem localidade → erro 503 (ou 400) com `results: []`; nada é persistido |
| nenhum dado falso | campo ausente na fonte volta vazio e listado em `campos_indisponiveis`; nenhum campo é inferido |

## 5. Limites conhecidos (registrados, não escondidos)

- **Regra de retorno (explícita):** o **limite de candidatos** (padrão 25, máximo 50)
  é o teto do que a busca devolve; a **quantidade alvo** (padrão 10) é a referência
  de trabalho do operador e dimensiona a amostra consultada. Portanto `quantidade
  alvo 5` com `limite 25` pode devolver **até 25** empresas, priorizando as que têm
  contato público. A resposta da API traz `query.quantidade_alvo`,
  `query.limite_candidatos` e `regra` com esse texto, e a UI mostra os dois campos
  separados. Prova: `test/discovery.test.js` (30 resultados na fonte, alvo 5, limite
  25 → 25 devolvidos; alvo 30, limite 4 → 4 devolvidos).
- **Proteção SSRF:** toda URL de terceiro (site do lead, provedor) passa por
  `lib/net/ssrf-guard.js` antes da requisição — localhost, RFC1918, link-local/
  metadata, host que resolve para IP privado e redirect público → privado são
  recusados. Ver `docs/EVIDENCIA-SSRF-E-REGRA-DE-QUANTIDADE-2026-09-19.md`.
- A completude do OpenStreetMap varia: telefone/website existem em parte dos
  estabelecimentos. A busca pede uma amostra maior (`máx(quantidade*2, 20)`) e
  ordena priorizando quem tem contato público — o que também vale para os testes.
- O Prospector histórico exigia **e-mail público**; o OpenStreetMap informa
  e-mail em uma minoria dos registros. O e-mail não foi tornado obrigatório
  porque o gate DS-VALUE-01 lista telefone/site como canais válidos e o
  enriquecimento (DS-VALUE-02) é o passo responsável por completar contato.
- Nicho sem tag mapeada cai em busca textual (nome/categoria) e volta com aviso
  explícito para revisão humana.
- Nenhuma migration foi necessária: `ds_leads` já possuía `source`,
  `source_url`, `source_checked_at`, `public_contact_type`, `contact_evidence`
  e `end_cliente`.

## 6. Comandos de verificação

```text
node --experimental-strip-types --test      # suíte completa
node scripts/secret-scan.mjs                # segredos
node scripts/discovery-smoke.mjs "restaurante" "Orlando, FL" 5   # teste real de rede
node scripts/discovery-e2e-local.mjs        # fluxo HTTP completo (stub de banco)
```
