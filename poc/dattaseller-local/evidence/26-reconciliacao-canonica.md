# Reconciliação canônica do DattaSeller

Data da auditoria: 2026-09-13.

## Base escolhida

A branch canônica é `codex/mvp-local-prospector` (HEAD `75bc353`). Ela contém
o núcleo SQLite persistente, os mocks locais, o dashboard reaproveitado e a
cobertura de regressão mais recente. A escolha não implica apagar as outras
linhagens: elas permanecem como proveniência no Git.

## Matriz de reconciliação

| Funcionalidade | Fonte / branch | Arquivos e commits relevantes | Teste/evidência reproduzida | Estado e decisão |
|---|---|---|---|---|
| Modelo comercial, deduplicação, checkout/pagamento/handoff Node | `master` | `274cf17` a `685564b`, `src/`, `test/` | `node --test test/*.test.js`: 10/10 no checkout atual; os seis arquivos históricos aparecem removidos no worktree do usuário e não foram restaurados | Preservar histórico; não fazer merge cego de um núcleo paralelo ao SQLite atual. |
| Dashboard Prospector, CRM e catálogo operacional | `codex/mvp-local-ready` | `3cb314b`, `3e40226`, `0cc298a`, `7eddd5d`, `d90844e`, `869c7a9`; `app/catalog.py`, dashboard e `tests/` | `python -m unittest discover -s tests -v`: 20/20 em worktree isolado | Reaproveitar seletivamente as regras comprovadas (catálogo, domínio HTTPS e evidências) sem substituir o modelo persistente atual. |
| Núcleo persistente local e fluxo comercial completo | `codex/mvp-local-prospector` | `e22997b` a `75bc353`; `app/dattaseller_local.py`, `dashboard-server.py`, `test_dattaseller_local.py` | `test_dattaseller_local.py -v`: 10/10; `prospector-mcp.py --teste`: OK | Integrar e evoluir: é a base canônica. |
| V0 visual | `v0/dattaseller-visual` | `a634f22`, `31a9a20`, `a44f731`, `a82bad0`; estilos e navegação | Histórico inspecionado; a concepção visual já foi absorvida pela POC antes dos commits do núcleo | Preservar histórico; não mesclar uma árvore sem base comum e sem funções comerciais. |

## Componentes reaproveitados

- Estrutura visual, navegação e responsividade do dashboard Prospector.
- Evidências históricas de dashboard e dos seis tamanhos responsivos, que ainda
  precisam de repetição após cada alteração visual relevante.
- Regras de catálogo que exigem URL HTTPS e domínio oficial para checkouts
  externos; no local, o checkout permanece mock.
- Template de contrato em
  `skills/prospector-contrato/references/contrato-template.html`, aplicado pelo
  núcleo local como minuta explícita e sem preencher dados ausentes.

## Componentes não integrados automaticamente

- O `catalog.py` histórico tem esquema independente (`catalog_products` e
  `catalog_offers`); copiá-lo inteiro duplicaria produto/preço no SQLite. Suas
  validações serão transpostas apenas onde faltarem no modelo `ds_products`.
- O núcleo Node de `master` é uma implementação comercial anterior. Seus
  arquivos removidos no worktree pertencem ao usuário e não serão restaurados
  nem incluídos sem uma comparação isolada posterior.
- A V0 fornece aparência, não workflow persistente; uma mesclagem direta
  perderia as ações comerciais atuais.

## Testes desta etapa

```text
worktree mvp-local-ready: python -m unittest discover -s tests -v  -> 20/20 OK
base canônica:            test_dattaseller_local.py -v            -> 10/10 OK
base canônica:            prospector-mcp.py --teste               -> OK
base canônica:            node --test test/*.test.js              -> 10/10 OK
```

O fetch de todas as refs foi executado antes da comparação. Não houve merge
nem alteração em arquivos fora de `poc/dattaseller-local`.
