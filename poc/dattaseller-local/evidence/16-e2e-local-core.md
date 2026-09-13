# E2E do núcleo comercial local — DS-MVP-16 a DS-MVP-36

Data: 2026-09-13

Comando executado:

```powershell
python app/dattaseller_local.py
```

Resultado: `DATTASELLER LOCAL E2E OK`.

O teste usa um SQLite temporário e verifica, sem rede nem dados de cartão: catálogo DEMO, proposta, e-mail em rascunho/aprovado/enviado-simulado, pedido, checkout aberto, pagamento aprovado idempotente, contrato HTML DEMO, handoff entregue e resumo financeiro. O arquivo temporário é removido ao término.

Segurança: os dados de teste usam exclusivamente o domínio reservado `local.invalid`; não há credenciais, contatos reais ou chamadas externas.
