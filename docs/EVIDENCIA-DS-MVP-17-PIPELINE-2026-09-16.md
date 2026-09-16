# Evidência DS-MVP-17 — pipeline comercial pré-publicação

Data: 2026-09-16. Branch: `prospector/reconciliation`. Escopo: validação
pré-publicação sem merge, deploy de Production, migration ou contato externo.

## Caso público controlado

O caso é `curtume-tropical-franca`, sem telefone, e-mail, pessoa, CNPJ ou
venda. As fontes públicas, a data de consulta e a proveniência estão em
[`CASO-PILOTO-CURTUME-TROPICAL-2026-09-15.md`](CASO-PILOTO-CURTUME-TROPICAL-2026-09-15.md):
site institucional, Instagram indicado pelo operador e contexto local.

O pipeline aceitou somente uma fonte com URL HTTP(S), slug seguro e nome. A
deduplicação permanece nas cinco chaves normalizadas: telefone, e-mail,
domínio, Instagram e nome+cidade. Qualificação exige fatos, hipóteses,
recomendação, motivo, confiança, pergunta de validação e próxima ação.

## Cadeia de artefatos

O lead controlado possui qualificação `qual_curtume_tropical_20260916`,
diagnóstico `diag_curtume_tropical_20260916`, auditoria social
`social_curtume_tropical_20260916` e um preview factual persistido. A proposta
`datta360 v1 draft` referencia o preview, comparador, diagnóstico e auditoria
social. Nenhum pedido, pagamento, envio de e-mail ou mensagem foi criado.

No Preview autenticado anterior, em 16/09/2026, o CRM recarregado mostrou:

- `CRM conectado`;
- 3 leads persistidos e 1 proposta registrada;
- o lead `curtume-tropical-franca` com links para preview e comparador e os IDs
  de diagnóstico e auditoria social;
- nenhum pedido registrado e receita/recebido iguais a R$ 0,00.

Isso confirma recuperação após reload da sessão autenticada sem criar novos
dados. O deployment da PR foi então conferido no Vercel: commit
`47e2155`, branch `prospector/reconciliation`, ambiente Preview, estado
`Ready`, domínio único
`https://v0-project-ntag10u29-datta-x.vercel.app`.

O domínio previamente aberto, `v0-project-mlux2apaa-datta-x.vercel.app`, era
outro deployment e não é usado como evidência de PR #5. O domínio correto
redireciona para `/login`, como esperado para uma sessão ausente no domínio
novo. Não foi executado logout/login para não interromper a sessão do operador
nem inserir credenciais. Os testes de autenticação e logout cobrem sessão
ausente/expirada de forma fail-closed.

## Proteções acrescentadas nesta validação

- uma fonte de prospecção não HTTP(S), como `javascript:` ou `file:`, é
  recusada;
- falha ao consultar o lead ou inserir um preview retorna `503
  storage_unavailable` e não emite evento de preview;
- erro ao persistir lead ou qualificação durante a importação assistida retorna
  `503 storage_unavailable`, sem resposta parcial de sucesso.

## Regressão executada

```text
node scripts/sync-dashboard.mjs
node scripts/production-dashboard-patch.mjs
node --experimental-strip-types --test     # 45/45
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
git diff --check
```

## Validação interativa e desvio corrigido

Em 16/09/2026, após login humano no Preview `47e2155`, a Central comercial
mostrou o lead `curtume-tropical-franca`, a proposta `datta360 v1 draft`, seu
preview, comparador, diagnóstico e auditoria social; nenhum pedido foi criado.
O preview factual e o comparador foram abertos e confirmaram a origem pública,
o rótulo de revisão humana e a ausência de alegações inventadas.

A recarga revelou um defeito de entrega: a primeira sessão carregava o
dashboard sincronizado, mas um reload recebia a versão-base do dashboard,
sem a camada Prospector e sem os dados. A configuração do projeto Vercel não
tinha override do build e usava o comando padrão do framework, que não executa
o `prebuild` do pacote. Isso torna o item **IMPLEMENTADO MAS NÃO TOTALMENTE
VALIDADO** até a publicação do ajuste.

O arquivo `vercel.json` passa a fixar `pnpm run build`. Esse comando chama o
`prebuild` existente, que sincroniza e aplica o patch do dashboard antes do
`next build`. Um teste de regressão verifica ambos os scripts. Após o Preview
desse ajuste ficar pronto, é obrigatório autenticar no domínio de Preview
atual e repetir o reload da Central comercial para encerrar o E2E.

Não é necessário nem autorizado mudar Supabase Production para esta etapa.
