# Evidência E2E local — fontes preservadas

Data: 2026-09-15.

O runtime isolado do workspace executou a fonte preservada em
`poc/dattaseller-local/app`, sem conexão de rede e sem usar o Supabase.
Nenhum banco permanente do POC existia antes da execução e os roteiros usam
SQLite temporário, removido ao final.

## Comandos e resultado

```text
python test_dattaseller_local.py -v
Ran 11 tests ... OK

python e2e_local.py
E2E LOCAL OK: Datta360, DattaVPS mock e negativo
```

O roteiro consolidado confirma, com fixtures `local.invalid`:

- Datta360: qualificação, diagnóstico, auditoria social, preview factual,
  proposta, e-mail simulado, pedido, checkout mock, pagamento, contrato e handoff;
- DattaVPS mock: recomendação, proposta, e-mail, checkout, pagamento,
  handoff e comissão;
- negativos: bounce/no-reply, checkout abandonado, pagamento recusado,
  contrato recusado/cancelado e retry de handoff.

## Limite desta evidência

Esta é uma revalidação do núcleo POC preservado. Ela não prova o E2E do
DattaSeller Next/Supabase, não aplica
`20260915212624_add_prospector_reconciliation.sql`, não usa lead real e não
autoriza deploy, contato, publicação ou alteração em Production.

Para fechar o E2E da integração web ainda são necessários: um ambiente
Supabase local/staging autorizado com a migration revisada e um lead de fonte
pública verificável para o redesign factual.
