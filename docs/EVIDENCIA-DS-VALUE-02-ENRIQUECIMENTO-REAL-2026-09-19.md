# Evidência — DS-VALUE-02 · Enriquecimento real com proveniência

**Data:** 2026-09-19
**Branch:** `codex/ds-value-01-discovery` (base `hardening/phase-a-containment-clean`)
**Gate:** DS-VALUE-02 — lead incompleto → dado público com valor + fonte + data + confiança
**Status declarado:** `PROVEN_REAL`

## 1. O que passou a existir

Antes: o lead descoberto ou manual ficava com o que o operador/site tinha. Nada
completava contato a partir de fonte pública.

Agora: `POST /api/enrichment` completa **somente campo vazio** do lead, usando
duas fontes reais e gratuitas, cada valor com origem, data, confiança e
classificação.

| Camada | Arquivo | Função |
| --- | --- | --- |
| Provedor real | `lib/enrichment/provider.js` | consulta o site público do próprio lead (contatos publicados na página) e o registro público do OpenStreetMap (Nominatim com `extratags`); normaliza, classifica e nunca infere |
| Regra de não sobrescrita | `planEnrichmentUpdate` | só preenche campo vazio; valor existente é preservado e reportado (`ignored`) |
| API | `app/api/[...path]/route.ts` (`POST /api/enrichment`) | autenticada, 404 para lead inexistente, 503 sem escrever quando nenhuma fonte responde (`lead_preservado: true`) |
| Persistência | `ds_leads.contact_evidence` (jsonb já existente) | cada campo aplicado entra como evidência com `field`, `value`, `source`, `source_url`, `checked_at`, `confidence`, `classification`; a trilha recebe `enrichment.applied` |
| Interface | `acoes()` no dashboard (patch de produção) + `dsEnriquecer()` | ação "enriquecer" em cada lead, com relatório do que entrou e do que foi preservado |

Nenhuma migration: `contact_evidence` e `tiktok_url` já existiam.

## 2. Teste funcional real (rede, fontes públicas)

```text
node scripts/enrichment-smoke.mjs "Empire Szechuan" "Orlando, FL" "https://empireszechuanfltogo.com/"
```

Lead de entrada: `Empire Szechuan` · `Orlando, FL` · site `https://empireszechuanfltogo.com/` ·
telefone já preenchido `(407) 555-0000`.

| Campo encontrado | Valor real | Fonte | Verificado em | Confiança | Classificação |
| --- | --- | --- | --- | --- | --- |
| telefone | `4078391236` | site público do lead (`tel:`) | 2026-09-19T17:38:49Z | high | confirmado |
| site_antigo | `https://empireszechuanfltogo.com/` | OpenStreetMap `node/940735101` | 2026-09-19T17:38:49Z | high | confirmado |
| end_cliente | `North Orange Avenue, 341 · Central Business District · Orlando, Flórida · 32801` | OpenStreetMap `node/940735101` | 2026-09-19T17:38:49Z | high | confirmado |

Resultado do plano de aplicação: `aplicaria: [end_cliente]` e
`preservaria: [telefone, site_antigo]` — o telefone já preenchido e o site do lead
**não** foram sobrescritos.

## 3. Teste funcional pela linha web (HTTP real)

```text
node scripts/discovery-e2e-local.mjs
```

CRM local (Next dev) apontado para um stub Supabase em memória — nenhuma base
real é tocada e o script aborta antes de escrever se a base de teste não estiver
vazia. As fontes do enriquecimento **não** são simuladas.

Resultado da execução:

- leads descobertos de verdade e já persistidos foram enriquecidos: `fat-rosie-s-taco-tequila-bar` recebeu `email` (`WaterfordLakes@fatrosies.com`) e `instagram_url` (`https://instagram.com/fat_rosies`) do próprio site, com classificação `confirmado`;
- lead incompleto criado pela entrada manual (`empire-szechuan`, só nome/cidade/fonte) recebeu `site_antigo` e `end_cliente` do OpenStreetMap;
- segunda passada: `telefone` (`4078391236`) veio do site público recém-descoberto, `site_antigo` e `end_cliente` foram **preservados**; `sobrescritos: 0`;
- o lead continuou existindo depois do enriquecimento (`lead_final.evidencia: 4`), com evidência de proveniência gravada.

## 4. Critérios do gate

| Critério | Como está atendido |
| --- | --- |
| valor | somente o que a fonte pública informa, já normalizado (telefone/e-mail/URL) |
| fonte | `site publico do lead` ou `openstreetmap`, com `source_url` do registro/página |
| data | `checked_at` ISO no momento da consulta |
| confiança | `high` para registro exato/página do próprio lead, `medium` para registro apenas parecido |
| classificação | `confirmado` ou `provável` (registro parcialmente coincidente), sempre registrada |
| não sobrescrever | `planEnrichmentUpdate` só preenche campo vazio; `force`/`ignorar` são explícitos do operador |
| falha não apaga o lead | nenhuma escrita quando a fonte falha; a API responde 503 com `lead_preservado: true` e o lead permanece |

## 5. Correção de deduplicação encontrada durante o teste

O teste funcional expôs um defeito real: `normalizeUrl(undefined)` montava
`new URL("https://undefined")` e devolvia o domínio literal `undefined`, de modo
que dois leads **sem site** eram considerados duplicados pelo critério `dominio`.
Corrigido em `lib/prospector.js` (campo vazio/null é ausência de dado) e travado
por teste de regressão em `test/discovery.test.js`.

## 6. Limites conhecidos (registrados, não escondidos)

- O enriquecimento não burla autenticação: analisa apenas páginas públicas abertas
  e o registro público do OpenStreetMap. Rede social com muro de login não é lida.
- E-mail público pode não existir no site/registro; nesse caso o campo continua
  vazio — nada é inferido de padrão de e-mail.
- A busca no OpenStreetMap depende do nome do lead; quando o registro coincide
  apenas parcialmente, o dado entra como `provável` e fica para revisão humana.

## 7. Comandos de verificação

```text
node --experimental-strip-types --test
node scripts/secret-scan.mjs
node scripts/enrichment-smoke.mjs "Empire Szechuan" "Orlando, FL" "https://empireszechuanfltogo.com/"
node scripts/discovery-e2e-local.mjs
```
