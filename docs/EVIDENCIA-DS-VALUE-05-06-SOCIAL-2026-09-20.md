# Evidência — DS-VALUE-05 e DS-VALUE-06 · Social real e demonstração visual

**Data:** 2026-09-20
**Branch:** `codex/ds-value-05-06-social-agent` (base canônica `8d8678e`)
**Gate:** DS-VALUE-05 (diagnóstico social real) e DS-VALUE-06 (demonstração social visual)
**Status declarado:** `PROVEN_REAL` (com os limites registrados abaixo)

## 1. Arquitetura (worker existente evoluído, sem projeto paralelo)

O DattaSeller Worker passou a **DattaSeller Agent**: mesmo processo, mesmo
contrato, mesma autenticação e mesma proteção SSRF — agora com três ações.

| Ação | O que faz | Onde |
| --- | --- | --- |
| `BUILD_REDESIGN` (preservada) | redesign com ativos reais (DS-VALUE-04) | `lib/redesign/*` |
| `ANALYZE_SOCIAL` (nova) | lê o perfil social **público** e registra fatos com proveniência | `lib/agent/social.js` |
| `BUILD_SOCIAL_DEMO` (nova) | gera direção visual + calendário 7 dias + 3 peças + 3 stories como artefato visual | `lib/agent/social-demo.js` |

Contrato: `POST /jobs`, `POST /jobs/redesign`, `POST /jobs/social-analysis`,
`POST /jobs/social-demo` e `GET /jobs/:id` (mesmo `job_id`/`status`/`artifact`).
O CRM orquestra em `POST /api/social` (responde `202` com `job_id`) e acompanha em
`GET /api/social?job=`. Persistência: `ds_social_audits` (auditoria) e
`ds_previews` (artefato visual), ambas idempotentes por job.

**Browser:** reaproveita o browser já disponível (Playwright), sem stack duplicada.
O Instagram entrega **muro de login** para HTML puro — comprovado em execução real
(`social_profile_not_public`, fail-closed). Quando o agente tem a leitura de um
browser real, ela entra como `browser_evidence` **validada pelo contrato** (mesmo
host do perfil do lead, com data e conteúdo mínimo) e o artefato marca
`evidence_source: browser`.

**LLM:** inventário do ambiente não encontrou provider autorizado. Foi criada
somente a **interface abstrata** (`resolveLlmProvider`, env
`DATTASELLER_LLM_PROVIDER`/`DATTASELLER_LLM_API_KEY`), sem contratar serviço, sem
criar conta e sem segredo no código. Sem provider, a composição é determinística a
partir dos dados reais e o artefato registra
`llm: { id: "deterministic-template", authorized: false }`. **A execução agentic
de LLM não é declarada comprovada** — isso exigirá autorização de provider.

## 2. Prova real (empresa real do DS-VALUE-01, com site + Instagram público)

Cadeia completa em `node scripts/redesign-e2e-local.mjs` (CRM local + stub Supabase
em memória + agente real por HTTP):

```text
Fat Rosie's Taco & Tequila Bar · Orlando, FL · OSM node/594968524
descoberta → enriquecimento (email + instagram) → diagnóstico (9 evidências)
→ BUILD_REDESIGN (preview_475cb14a95c6, editor e comparador OK)
→ ANALYZE_SOCIAL → auditoria social_5e77f5860936
→ BUILD_SOCIAL_DEMO → preview_692baf8b186b
```

Fatos sociais reais (perfil `https://www.instagram.com/fat_rosies/`, lido em
browser real em 2026-09-20T00:13Z, 8 evidências com fonte e data):

| Critério | Valor observado |
| --- | --- |
| handle | `fat_rosies` |
| contadores | 37.200 seguidores · 98 seguindo · 1.752 publicações |
| bio pública | "Chicagoland and Orlando loud and proud Mexican fave since 2015" + link da bio |
| links publicados | `linktr.ee/fatrosiestacoandtequila_` |
| formatos observados | feed (publicações) |
| imagem de perfil | URL pública da foto do perfil |
| limitação registrada | links da bio e formatos completos não são visíveis no HTML público sem autenticação (`social_limits_public_html`) |

## 3. Demonstração social (DS-VALUE-06)

Segue o material original (`docs/sources/prospector/OS-5-PROMPTS-SERVICOS-COM-IA-extracted.md`):
**Nome · O que vende · Público · Tom de voz · O que NUNCA dizer** e, por peça,
**gancho + legenda + 5 hashtags + sugestão visual**.

Artefato entregue (preview `preview_692baf8b186b`, HTML renderizável de ~11 KB):
direção visual com a paleta real (`#ffc400`/`#3a7f20`) e o logo real do cliente,
**calendário de 7 dias**, **3 peças de feed** (cada uma com gancho, legenda, 5
hashtags e sugestão visual usando foto real), **3 stories** e o bloco
**"O que NUNCA dizer"** (6 regras). Prova social e oferta vêm marcadas como
`requires_client_input` — nenhum depoimento, nota ou preço foi inventado.

"Público" e "Tom de voz" são derivados dos textos publicados quando há sinal
(tratamento por "você", termos de público) e, sem sinal, ficam como
`a_confirmar_com_cliente` — nunca preenchidos por suposição.

## 4. Responsividade medida em navegador real

Artefato servido pelo CRM, medido em 6 larguras:

| Largura | scrollWidth | rolagem horizontal da página |
| --- | --- | --- |
| 360 | 345 | não |
| 375 | 360 | não |
| 768 | 753 | não |
| 1024 | 1009 | não |
| 1280 | 1265 | não |
| 1440 | 1425 | não |

O calendário de 7 dias é um painel com rolagem interna própria no celular
(`.tabela-wrap{overflow-x:auto}`) — a página não rola na horizontal em nenhuma
largura. Prints: `social-demo-360.png`, `social-demo-768.png`, `social-demo-1440.png`.

## 5. Limites registrados (não escondidos)

- Perfil: só o que a página pública expõe sem autenticação (nome, bio, contadores,
  imagem, links publicados, abas quando existem). Nenhum bypass de CAPTCHA, login
  de terceiro ou coleta privada.
- Cadência de postagem não é derivável da página pública (registrado no artefato).
- Sem provider de LLM autorizado, a copy é composta de forma determinística com os
  dados reais do cliente (rótulos fixos + conteúdo publicado); algumas peças usam
  textos publicados que são rótulos do próprio site (ex.: bairro/unidade) e por isso
  passam por revisão humana.
- Nada é publicado automaticamente: a demonstração é material de aprovação.

## 6. Comandos

```text
node --experimental-strip-types --test
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
node scripts/redesign-e2e-local.mjs                  # prova real completa
REDESIGN_E2E_BROWSER_EVIDENCE=<json> node scripts/redesign-e2e-local.mjs --serve
node scripts/redesign-worker.mjs --host 0.0.0.0 --port 4599   # agente em VPS
```
