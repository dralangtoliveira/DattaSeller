# Auditoria de não regressão de interface — antes do merge do PR #18

**Data:** 2026-09-19
**BASE:** `origin/hardening/phase-a-containment-clean`
**HEAD:** `codex/ds-value-01-discovery`
**Objetivo:** garantir que DS-VALUE-01/02/03 foram **aditivos** e que nenhum módulo,
view, handler ou entrada existente foi removido.

## 1. Qual é a interface de referência

`UI_BASELINE` = **`public/dashboard.html`** — o artefato web servido pela aplicação
(`/` redireciona autenticado para `/dashboard.html`; `proxy.ts` exige admin). Essa é
a referência visual e operacional.

`poc/dattaseller-local/app/dashboard.html` é a **POC/base histórica** — origem da
sincronização (`scripts/sync-dashboard.mjs`) — e **não** é a interface final. Esse
pipeline já existe na base canônica: nada nele foi criado por este PR.

## 2. Módulos (menu canônico) BASE × HEAD

Os 13 módulos existem, com os mesmos identificadores, rótulos e handlers, na BASE e
no HEAD, tanto na POC quanto no artefato publicado:

| # | id | rótulo | handler |
| --- | --- | --- | --- |
| 1 | `geral` | Visão geral | `vGeral` |
| 2 | `prospeccao` | Prospecção | `vProspeccao` |
| 3 | `pipeline` | Pipeline | `vPipeline` |
| 4 | `clientes` | Clientes | `vClientes` |
| 5 | `intelligence` | Inteligência | `vIntelligence` |
| 6 | `workspace` | Central comercial | `vWorkspace` |
| 7 | `timeline` | Timeline | `vTimeline` |
| 8 | `sites` | Sites / Preview | `vSites` |
| 9 | `comparador` | Comparador | `vComparador` |
| 10 | `followup` | Follow-ups | `vFollowup` |
| 11 | `contratos` | Contratos | `vContractsLocal` |
| 12 | `financeiro` | Financeiro | `vFinanceiroLocal` |
| 13 | `config` | Configurações | `vConfigLocal` |

Removidos: **nenhum**. Adicionados: **nenhum** módulo (as capacidades novas são
seções dentro do módulo Prospecção e ações por lead).

## 3. Comparação por arquivo

| Arquivo | Resultado |
| --- | --- |
| `scripts/sync-dashboard.mjs` | idêntico à BASE |
| `scripts/production-dashboard-patch.mjs` | nenhum id, função, handler ou painel removido; acrescenta `dsEnriquecer` e `dsDiagnostico` às ações do lead |
| `poc/dattaseller-local/app/dashboard.html` | nenhuma função/id/painel removido; acrescenta `dsDescobrir`, `dsAdicionarDescobertos`, `dsToggleDisc`, `dsDiscSelCount`, `vDiscPainel`, `dsEnriquecer`, `dsDiagnostico`, `dsAddCand`, `dsRemoveCand`, `dsSalvarCands`, `dsSlugify`, `dsF` e os campos `disc-*`, `cand-*`, `busca-*` |
| `public/dashboard.html` | espelho do anterior + patch de produção (`publicado == sync(poc) + patch`, travado por teste) |

## 4. Desvio encontrado e corrigido nesta auditoria

Ao comparar comportamento (não só texto), apareceu **um** ponto: a entrada
**"Pesquisa pública assistida"** (importação em lote de candidatos em JSON), que na
BASE era o conteúdo do módulo Prospecção, havia ficado sem ponto de entrada na UI —
o handler `dsProspect()` continuava existindo, mas nenhum painel o chamava.

Ação (aditiva, sem redesenho): o painel herdado foi restaurado como uma seção da
Prospecção, com os **mesmos ids** (`prospect-niche`, `prospect-city`,
`prospect-region`, `prospect-radius`, `prospect-product`, `prospect-target`,
`prospect-limit`, `prospect-candidates`, `prospect-result`), os mesmos rótulos e o
mesmo botão ("Salvar e deduplicar" → `dsProspect()`). A implementação web continua
sendo a do patch (`window.dsProspect`), com o mesmo payload para `/api/prospects`.

Com isso: `REMOVED_EXISTING_CAPABILITIES: NONE`.

## 5. Como as capacidades novas entram

- **Descoberta (DS-VALUE-01):** painel novo **dentro** do módulo Prospecção, acima
  do cadastro manual (`vDiscPainel()` chamado por `vProspeccao()`), sem tocar nos
  outros módulos.
- **Enriquecimento (DS-VALUE-02) e diagnóstico (DS-VALUE-03):** ações novas na
  lista de ações de cada lead (`acoes()`), ao lado das que já existiam
  (WhatsApp, e-mail, dados, excluir).
- Nenhum módulo, view ou painel existente foi movido, renomeado ou removido.

## 6. Teste de regressão de interface

`test/dashboard-modulos.test.js` (novo) falha se qualquer um dos 13 módulos
desaparecer do menu, do mapa de `views` ou perder o handler; falha também se a
importação JSON herdada, o cadastro manual, a descoberta, o enriquecimento ou o
diagnóstico sumirem; e compara o artefato publicado com a BASE
(`origin/hardening/phase-a-containment-clean`) recusando qualquer módulo removido.
Quando a base não está disponível no clone (checkout raso), o teste de comparação
é explicitamente ignorado em vez de passar em silêncio.

## 7. Validação visual: use a aplicação web, não o arquivo da POC

Para inspecionar a interface do produto, abra o artefato **servido**:

- Produção: `https://crm.datta360.com.br/dashboard.html`
- Preview do PR: URL de deployment do PR + `/dashboard.html` (o Preview está atrás
  da proteção Vercel Authentication — ver `BLOCKERS.md`)
- Local: `npm run dev` → `http://localhost:3000/` (redireciona para
  `/dashboard.html` com sessão admin)

Abrir `poc/dattaseller-local/app/dashboard.html` como `file://` mostra a POC
histórica em modo arquivo (sem servidor, sem dados reais) e **não** representa a
interface final.

## 8. Verificações executadas

```text
node --experimental-strip-types --test        # inclui test/dashboard-modulos.test.js
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
git diff --check
node scripts/secret-scan.mjs
```
