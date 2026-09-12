# Webhook de confirmação de pagamento

**Card:** CCD-19  
**Domínio:** `src/payments/webhook.js`

O webhook valida HMAC SHA-256, persiste o evento antes de processá-lo e o trata em uma transação. Um replay retorna sucesso sem criar segundo pagamento, venda ou entrega. Eventos sem pedido correspondente são guardados para reconciliação, em vez de alterar o banco manualmente.

O adaptador ainda precisa ser ligado ao provedor de checkout real e a uma implementação PostgreSQL do `store`.
