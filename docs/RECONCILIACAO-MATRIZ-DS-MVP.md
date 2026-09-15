# Matriz de reconciliação Prospector → DattaSeller

Base auditada: `prospector/reconciliation` sobre `hardening/audited-production-fixes`.
Fontes: inventário local 17, plano MVP, skills preservadas, `vendor/prospector-original`,
histórico Git e CRM Next/Supabase atual. Esta matriz distingue evidência local histórica
de integração efetivamente acessível no CRM web.

| DS-MVP | Requisito/origem | Código original e commit | Web atual: backend / interface / persistência / teste | Estado e perda na migração |
| --- | --- | --- | --- | --- |
| 02 | Seis skills operacionais preservadas | `vendor/prospector-original/packages/*`; `afb44ac` | Fontes preservadas em `poc/dattaseller-local/skills`; hashes em `SHA256SUMS.txt`; sem tela própria | **PRONTO** como proveniência; fluxos ainda precisam ser expostos pelo CRM atual |
| 08 | Entrada de lead público sem e-mail | `prospector-prospeccao`, `prospector-mcp.py`; `1c80d9e` | `POST /api/prospects` e `saveProspect`; tela Prospecção aceita nicho/cidade/região e candidatos JSON; `ds_leads`; `test/prospector.test.js` | **PARCIAL**: contatos públicos sem e-mail funcionam, mas falta entrada visual completa para produto, raio, quantidade e limite e uma fonte operacional reutilizada |
| 09 | Deduplicação por telefone, e-mail, domínio, Instagram, nome+cidade | `prospector-mcp.py`; `1c80d9e` | `lib/prospector.js`, `saveProspect`; migration local com normalizações; teste das cinco chaves | **PARCIAL**: algoritmo e teste existem; a migration de normalizações não está aplicada e o enriquecimento de evidências de duplicata é incompleto |
| 10 | Qualificação separando fato, hipótese e recomendação | `prospector-prospeccao`; `90e7962` | `POST /api/qualifications`; Inteligência; `ds_qualifications`; testes de API existentes | **PRONTO** para gravação manual; integração automática ao resultado de prospecção é **PARCIAL** |
| 11 | Preview factual persistido | `prospector-redesign`; `8febd6a` | `POST /api/previews`, editor e URL persistida; `ds_previews`; teste de rota/dashboard | **PARCIAL**: preservado, mas o conteúdo gerado é uma página factual mínima, não o redesign visual original |
| 12 | Comparador antes/depois | `references/comparador-template.html`; `e6d8a25` | view `comparador` e previews persistidos; dashboard atual | **OCULTO NA UI / PARCIAL**: menu foi restaurado pelo patch, mas falta conectar o comparador a um redesign visual real |
| 13 | Editor visual de preview | `references/editor-visual.md`; `921d0c5` | `PUT /api/previews/:id`; editor de título/corpo/CTA; `ds_previews` | **PARCIAL**: revisão humana persiste, mas não recupera o editor visual do Prospector |
| 14 | Diagnóstico factual de site | `prospector-redesign`; `90e7962` | `POST /api/diagnoses`; Inteligência; `ds_site_diagnoses` | **PRONTO** para registro factual, com cobertura de integração ainda parcial |
| 15 | Auditoria Instagram/TikTok e direção visual | `prospector-prospeccao`; `90e7962` | `POST /api/social-audits`; Inteligência e direção social; `ds_social_audits`; teste de contrato | **PARCIAL**: estrutura e direção existem, mas faltam formulário completo e evidência visual organizada no fluxo da proposta |
| 16 | Proposta comercial versionada com artefatos | `prospector-proposta`; `178ba1f`, `e22997b` | `POST /api/proposals`; Central comercial; `ds_proposals.artifacts` na migration local; testes financeiros e de API | **PARCIAL**: proposta incorpora IDs de artefatos quando existentes; falta apresentar esses artefatos de modo verificável na interface e no E2E |

## Requisitos transversais

- Navegação: `prospeccao`, `intelligence`, `sites` e `comparador` estão restauradas pelo
  patch de produção; verificar visualmente no E2E é pendência.
- Segurança: não há scraper novo, contato automático, publicação ou envio automático nesta
  branch. A migration `20260915212624_add_prospector_reconciliation.sql` permanece local.
- Evidência: o inventário histórico comprova o MVP local; a matriz acima é a evidência de
  que a integração Supabase/Next ainda requer recuperação incremental, sem substituir o
  material original.
