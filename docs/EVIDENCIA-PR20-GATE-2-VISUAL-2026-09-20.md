# Evidência — PR #20 · Gate 2 visual servido

Data: 2026-09-20
Escopo: somente a interface servida localmente; sem HML e sem Production.

## Resultado

`GATE_2_VISUAL_13_MODULES: PASS (13/13)`

- título servido: `DattaSeller — CRM Comercial`;
- 13 botões canônicos de navegação encontrados;
- 13 módulos clicados e renderizados sem tela branca;
- `erros_js: []` (zero pageerrors);
- ida e volta concluída em `Visão geral`;
- dados/API interceptados localmente com `CRM_VISUAL_MOCK_API=yes`, sem escrita externa.

## Artefatos locais reproduzíveis

- relatório: `.redesign-e2e/crm-visual-fixed/relatorio.json`;
- capturas: `.redesign-e2e/crm-visual-fixed/crm-*.png` (dashboard e um arquivo por módulo).

Os arquivos são intencionalmente ignorados pelo Git por serem capturas de execução;
o relatório acima registra os resultados verificáveis sem incluir segredos ou dados
de HML/Production.

## Dependência do navegador

`@playwright/test` é dependência de desenvolvimento em versão exata (`1.51.1`).
Em um checkout limpo, execute `pnpm install --frozen-lockfile` e
`pnpm run browser:install` antes da validação visual.
