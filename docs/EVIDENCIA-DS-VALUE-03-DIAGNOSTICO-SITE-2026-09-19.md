# Evidência — DS-VALUE-03 · Diagnóstico factual do site real

**Data:** 2026-09-19
**Branch:** `codex/ds-value-01-discovery` (base `hardening/phase-a-containment-clean`)
**Gate:** DS-VALUE-03 — URL real → diagnóstico factual com evidências
**Status declarado:** `PROVEN_REAL`

## 1. O que passou a existir

Antes: existiam rota e tabela de diagnóstico, mas a análise do site real não
estava comprovada ponta a ponta.

Agora: `POST /api/diagnosis` abre o site público do lead e registra somente o que
foi observado na resposta HTTP e no HTML, com evidência por critério.

| Camada | Arquivo | Função |
| --- | --- | --- |
| Motor | `lib/diagnosis/site.js` | busca a página pública, lê resposta/HTML e produz fatos + evidências |
| API | `app/api/[...path]/route.ts` (`POST /api/diagnosis`) | grava em `ds_site_diagnoses`, atualiza `ds_leads.site_audit_json` e registra `site.diagnosis` na trilha; falha fechado (503) sem escrever |
| Interface | ação "diagnóstico" por lead (`acoes()` no patch + `dsDiagnostico()`) | o operador dispara e vê os fatos no CRM |

Nenhuma migration: `ds_site_diagnoses` e `ds_leads.site_audit_json` já existiam.

## 2. Critérios observados (sempre com valor do que foi visto)

| Critério | Observação registrada |
| --- | --- |
| resposta_http | status real da URL final |
| titulo | `<title>` declarado (ou ausência explícita) |
| proposta_de_valor | meta description declarada (ou ausência explícita) |
| cta | textos de chamada para ação encontrados no HTML (ou nenhum reconhecido) |
| mobile | presença da meta viewport |
| hierarquia | quantidade de H1/H2 e seus textos |
| contato | `mailto:`, `tel:`, formulário, WhatsApp encontrados na página |
| prova_social | links de Instagram/Facebook reconhecidos no HTML |
| imagens | total de `<img>` e quantas estão sem `alt` |

O diagnóstico **não** afirma lentidão, insegurança, problema de SEO ou perda de
cliente: esses julgamentos exigem teste que este gate não executa. Teste
automatizado garante que essas afirmações não apareçam no resultado.

## 3. Teste funcional real (rede, site público)

```text
node scripts/diagnosis-smoke.mjs "https://empireszechuanfltogo.com/"
```

Resultado real: `HTTP 200` · título `Home | Empire Szechuan` · meta description
real com telefone `407-839-1236` · viewport declarado · `H1: 1 · H2: 5` ·
`tel:` presente · 12 imagens, 0 sem `alt` · canonical declarado · 9 evidências
registradas em `2026-09-19T17:52Z`.

## 4. Teste funcional pela linha web (HTTP real)

```text
node scripts/discovery-e2e-local.mjs
```

O fluxo parte de nicho+cidade, persiste empresas reais, enriquece um lead
incompleto (`empire-szechuan`) e então diagnostica o site real do lead:
`POST /api/diagnosis` → `201` com `http_status 200`, título real, viewport
declarado, contatos publicados e 9 evidências; o lead continua no CRM com a
trilha `site.diagnosis`.

## 5. Limites conhecidos

- Lê apenas HTML público: conteúdo renderizado exclusivamente por JavaScript
  pode não aparecer no HTML analisado.
- Não executa auditoria de performance, segurança ou SEO — isso não é afirmado
  sem teste (regra do contrato).
- `DS-VALUE-04` (redesign individualizado com ativos reais, editor e comparador)
  permanece **MISSING**: o diagnóstico factual não o substitui.
