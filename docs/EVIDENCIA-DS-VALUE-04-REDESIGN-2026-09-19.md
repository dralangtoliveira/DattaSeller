# Evidência — DS-VALUE-04 · Redesign individualizado com ativos reais

**Data:** 2026-09-19
**Branch:** `codex/ds-value-04-redesign` (base canônica `bf43fa5`)
**Gate:** DS-VALUE-04 — empresa real → redesign individualizado → persistido → editor → comparador → responsividade
**Status declarado:** `PROVEN_REAL`

## 1. Arquitetura (decisão registrada)

| Camada | O que faz | Onde |
| --- | --- | --- |
| DattaSeller web | orquestra, guarda sessão, lê lead/diagnóstico do CRM, persiste em `ds_previews`, serve editor e comparador | `app/api/[...path]/route.ts` (`POST /api/redesign`, `GET /api/redesign?job=`, `GET /api/worker/context`) |
| DattaSeller Worker Agent (um só executor, ação `BUILD_REDESIGN`) | coleta ativos públicos reais, gera a nova versão, devolve artefato estruturado | `lib/redesign/{contract,collector,generator,worker}.js` + `scripts/redesign-worker.mjs` |
| Contrato entre eles | `POST /jobs/redesign { lead_slug, site_url, diagnosis_id }` → `{ job_id, status }`; `GET /jobs/:id` → `{ status, artifact }`; contexto do CRM por referência (`context_url` autenticado por token) | mesmo módulo + `scripts/redesign-worker.mjs` |

O CRM nunca fica com requisição longa aberta (responde `202` com `job_id`) e o
worker roda fora da Vercel (bind local por padrão; host/porta por env ou CLI, além
do modo `--once`). Não há multiagente.

MIGRAÇÃO POR PARIDADE FUNCIONAL: a skill histórica previa publicação em ChatGPT
Sites; a obrigação funcional foi preservada na infraestrutura web atual (artefato
acessível no DattaSeller + editor + comparador + proposta pública futura), sem
dependência nova de fornecedor.

## 2. Prova real (empresa real descoberta pelo DS-VALUE-01)

Cadeia executada com `node scripts/redesign-e2e-local.mjs` (CRM local + stub
Supabase em memória + Worker Agent real falando por HTTP):

```text
nicho restaurante · cidade Orlando, FL
lead  fat-rosie-s-taco-tequila-bar  (Fat Rosie's Taco & Tequila Bar)
fonte https://www.openstreetmap.org/node/594968524  ·  site real https://www.fatrosies.com/location/waterford-lakes/
enriquecimento (DS-VALUE-02): email + instagram atualizados; telefone, site e endereço preservados
diagnóstico (DS-VALUE-03): HTTP 200, 9 evidências
BUILD_REDESIGN: job mode=worker · 3s · preview preview_371153fff77e · 0 avisos
editor: 200, com "Modo edição"/"Exportar página"
comparador: 200, site atual + /api/previews/preview_371153fff77e
```

Ativos usados, todos com fonte e data (artefato em `.redesign-e2e/artifact.json`):

| Ativo | Valor real | Fonte registrada |
| --- | --- | --- |
| logo | `images.getbento.com/.../53962FR_Logo-01-edit.png` | página real do cliente |
| foto | `images.getbento.com/.../18723Orlando_Front.jpg` | página real do cliente |
| paleta | `#ffc400` (amarelo da marca) e `#3a7f20` | CSS publicado pelo cliente |
| headline | "Orlando's Best Taco & Tequila Bar" | H1 do site do cliente |
| endereço | N Alafaya Trail, 749 · Orlando, FL · 32828 | enriquecimento/OSM confirmado no CRM |
| telefone / e-mail | 6892660444 · WaterfordLakes@fatrosies.com | site + enriquecimento |
| seções | "Hours & Location", "Galeria", "Contato" | títulos do próprio cliente |

Nada foi inventado: o gerador só emite conteúdo coletado + rótulos fixos de
interface, e `findForbiddenClaims` bloqueia afirmações sem fonte (anos de
experiência, "melhor da cidade", estrelas/avaliações, garantias, depoimentos
fabricados). Sem logo real a marca sai tipográfica; sem fotos a galeria não é
renderizada; lista sem título publicado não é renderizada com rótulo nosso.

## 3. Responsividade medida em navegador real (Playwright)

Preview servido pelo CRM, medido em 6 larguras (`documentElement.scrollWidth` vs
`window.innerWidth` e elementos que ultrapassam a viewport):

| Largura | scrollWidth | overflow-x | elementos fora da viewport |
| --- | --- | --- | --- |
| 360 | 345 | não | 0 |
| 375 | 360 | não | 0 |
| 768 | 753 | não | 0 |
| 1024 | 1009 | não | 0 |
| 1280 | 1265 | não | 0 |
| 1440 | 1425 | não | 0 |

Prints: `redesign-360.png`, `redesign-768.png`, `redesign-1440.png`,
`redesign-editor.png`, `redesign-comparador.png` (pasta de artefatos da sessão).

## 4. Editor e comparador (infraestrutura existente, não reconstruída)

- Editor: `GET /api/previews/<id>/editor` → `withProspectorEditor` injetado sobre o
  redesign real; a barra "Modo edição" com "Exportar página" fica visível e o
  clique no H1 o torna `contenteditable="true"` (verificado no navegador).
- Comparador: `GET /api/comparators/<lead>` → `renderProspectorComparator` com dois
  iframes: o site atual do cliente e a nova versão servida pelo CRM. O site atual
  pode recusar embed (X-Frame-Options do próprio cliente) — o comparador já oferece
  "abrir em nova aba"; a nova versão carrega normalmente.

## 5. Persistência e trilha

- `ds_previews` recebe o redesign (`kind: "redesign"`, `status: "ready"`,
  `content` = HTML, `url` = `/api/previews/<id>`), vinculado ao lead.
- Trilha: `redesign.queued` (job + modo), `redesign.generated` (layout, ativos,
  avisos) e `redesign.persisted` (`<job_id>|<preview_id>`), o que torna a ingestão
  idempotente — repetir o acompanhamento do mesmo job não cria segundo preview.
- O lead ganha `url_nova` e, se ainda estava em `novo`, passa a `redesenhado`.

## 6. Segurança e limites

- Todo acesso a URL de terceiro passa pelo guard SSRF do PR #18: site do cliente,
  página de contexto e ativos em host privado são recusados/descartados.
- O contexto do CRM é entregue por referência (`GET /api/worker/context`) com token
  do worker ou sessão admin; sem isso, 401.
- Limites: o worker referencia as imagens públicas originais (não copia arquivos);
  se o cliente tirar a imagem do ar, ela deixa de carregar. Página com conteúdo só
  em JavaScript rende menos texto (aviso `redesign_thin_html`). Não há auditoria de
  performance/segurança — não é afirmado nada desse tipo.

## 7. Comandos

## 8. Endurecimento após revisão técnica (antes do merge)

| Achado da revisão | Correção | Prova |
| --- | --- | --- |
| `context_url` aceitava URL absoluta e o worker fazia `fetch` direto | `parseContextPath` só aceita caminho relativo (`/api/...`); `resolveContextUrl` monta o destino com `new URL(path, DATTASELLER_API_URL)` e confirma que a origem é a configurada; recusa `http(s)://`, `//host`, `file:`, `ftp:`, `javascript:`, `data:` e barra invertida | `test/redesign.test.js` — "o context_url do job só aceita caminho relativo…" |
| Worker podia subir exposto sem segredo | bind externo (`0.0.0.0`, IP da VPS) sem `DATTASELLER_WORKER_SECRET` → **não inicia** (`WORKER_CONFIG_INVALID`, exit 2); loopback continua em modo dev; com segredo, `POST /jobs/redesign` e `GET /jobs/:id` respondem 401 sem ele | testes de spawn do worker (início recusado) + teste das rotas com/sem segredo |
| Contexto do CRM podia cair em silêncio para "sem contexto" | `DATTASELLER_API_URL` sem `DATTASELLER_WORKER_TOKEN` → config inválida (exit 2); no modo worker o contexto é obrigatório (`requireContext`) e o job **falha** sem ele; o artefato registra `commercial_context` e `required_context` | teste de configuração + artefato real com `commercial_context: true`, `context_source: crm` |
| WhatsApp prefixava 55 em qualquer número | nenhum DDI é inventado: usa o número publicado em `wa.me`/`api.whatsapp.com`, o número com `+` explícito ou com DDI já presente (12+ dígitos); o 55 só entra quando o Brasil é comprovado pelos dados do lead. Sem DDI comprovado, o CTA vira o telefone real e a página registra o aviso `redesign_whatsapp_country_unknown` | testes com `+55 11…`, `+1 407…`, `wa.me/1407…`, número sem DDI em país desconhecido |
| `tel:` recebia `+` mesmo sem DDI | `tel:` reproduz o que a fonte publicou (com `+` só quando o número veio internacional) | teste com `tel:6892660444` (lead dos EUA) |

A prova real foi reexecutada depois das correções com o mesmo caso (Fat Rosie's,
EUA): `wa.me` ausente (sem DDI inventado), CTA `tel:6892660444`, contexto do CRM
obrigatório e obtido, 0 avisos, persistência/editor/comparador íntegros.

```text
node --experimental-strip-types --test
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
node scripts/redesign-worker.mjs --once --lead-slug <slug> --site-url <url> --diagnosis-id <id> --out artefato.json
node scripts/redesign-e2e-local.mjs            # prova real ponta a ponta
node scripts/redesign-e2e-local.mjs --serve    # mantém no ar para QA visual
```
