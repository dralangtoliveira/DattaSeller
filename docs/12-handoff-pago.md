# Handoff pago para DattaVPS e DattaSeg

**Cards:** CCD-43 e CCD-44  
**Domínio:** `src/integrations/paid-handoff.js`

O Seller envia handoff somente de pedidos pagos. O payload leva IDs comerciais, plano, valor, moeda, correlação e a mesma chave de idempotência em todas as tentativas. Para DattaVPS, acrescenta região; para DattaSeg, requisitos comerciais e vendedor.

O adaptador só encaminha o payload e registra o ID/status devolvido ou a falha explícita. Ele não provisiona VPS nem cria tenants ou onboarding técnico. APIs, autenticação e callbacks dos dois produtos ainda não foram publicados, portanto a execução real permanece bloqueada.
