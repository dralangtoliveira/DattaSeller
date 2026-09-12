# Comissões

**Card:** CCD-23  
**Domínio:** `src/commissions/commission.js`

Comissão só é criada para venda paga. A regra possui versão, taxa e moeda da venda; estorno ou cancelamento exige motivo e gera reversão auditável. Vendedores enxergam apenas os próprios registros, enquanto Financeiro e Admin podem conciliar todos.

A gravação no banco e o gatilho de pagamento serão conectados quando o store PostgreSQL e o checkout real existirem.
