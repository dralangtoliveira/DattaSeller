# Pipeline comercial e de entrega

**Card:** CCD-20  
**Domínio:** `src/delivery/state-machine.js`

O funil comercial termina em venda paga. A entrega usa estados próprios: `awaiting_payment`, `paid`, `handoff_pending`, `handoff_sent`, `onboarding`, `in_delivery`, `awaiting_customer`, `delivered` e `blocked`.

Uma integração com falha exige causa explícita e pode voltar para tentativa controlada. O domínio não muda plano, produto ou estado de pagamento para contornar indisponibilidade externa.
