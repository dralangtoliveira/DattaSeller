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

No Preview autenticado, em 16/09/2026, o CRM recarregado mostrou:

- `CRM conectado`;
- 3 leads persistidos e 1 proposta registrada;
- o lead `curtume-tropical-franca` com links para preview e comparador e os IDs
  de diagnóstico e auditoria social;
- nenhum pedido registrado e receita/recebido iguais a R$ 0,00.

Isso confirma recuperação após reload da sessão autenticada sem criar novos
dados. Não foi executado logout/login para não interromper a sessão do
operador; os testes de autenticação e logout cobrem sessão ausente/expirada de
forma fail-closed.

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

Ainda é necessário um login novo conduzido pelo operador, se a organização
quiser registrar evidência interativa de uma nova autenticação no Preview. Não
é necessário nem autorizado mudar Supabase Production para esta etapa.
