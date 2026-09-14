# Checkout e pagamento mock — cenário negativo visual

Data: 2026-09-13. Dashboard local em `http://127.0.0.1:8765/dashboard.html`, sem provider externo.

## Roteiro reproduzido

1. Na **Central comercial**, foi criado o pedido `ord_a48b41f28d16` a partir da proposta `ui-evidence-demo`.
2. O botão **abrir** criou checkout mock em `open`.
3. A ação visual **expirar** alterou o checkout para `expired`.
4. A ação visual **cancelar** alterou o pagamento para `cancelled`.

O pedido já concluído `ord_f2506b6131f3` permaneceu independente, com checkout `completed` e pagamento `approved`; portanto o cenário negativo não contaminou a venda positiva.

## Cobertura complementar

- `test_order_checkout_payment_contract_handoff_commission_financial` cobre `open`, `abandoned`, `completed` e `expired` no checkout, além de aprovação idempotente.
- `test_payment_cancellation_and_refund` cobre `cancelled` e `refunded`.
- Suíte local após a alteração: **10/10 aprovada**.

Commit funcional: `9a8b980 fix(DS-MVP-27): expose checkout expiry and payment cancellation`.
