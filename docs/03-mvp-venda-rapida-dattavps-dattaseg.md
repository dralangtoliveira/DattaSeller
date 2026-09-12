# MVP Venda Rápida — DattaVPS + DattaSeg

**Card:** CCD-1 — Definir contrato funcional do MVP da Central Comercial  
**Versão:** 1.0  
**Data:** 2026-09-11

## 1. Objetivo e fronteira

O DattaSeller permite que um vendedor trabalhe um lead até a venda paga e acompanhe o handoff para o produto vendido. Ele é dono do CRM comercial, catálogo comercial, pedido, checkout referenciado, confirmação de pagamento, comissão, histórico e estado de entrega.

DattaVPS é dono da infraestrutura, disponibilidade técnica, provisionamento, operação e status de serviço. DattaSeg é dono do produto de segurança, tenant, onboarding técnico, operação e status do serviço. O Seller não replica nenhuma dessas capacidades.

| Fluxo | Dono | Responsabilidade do DattaSeller |
|---|---|---|
| Lead → oportunidade | DattaSeller | Identidade, origem, histórico, recomendação, vendedor e funil. |
| Oferta e plano comercial | DattaSeller com aprovação do produto | Produto, plano externo, preço, moeda, condições e disponibilidade comercial. |
| Pedido → checkout → pagamento | DattaSeller | Pedido comercial, URL de checkout, webhook autenticado, venda paga e comissão. |
| Pós-pagamento DattaVPS | DattaVPS | Enviar handoff idempotente e registrar ID/status devolvidos. |
| Pós-pagamento DattaSeg | DattaSeg | Enviar handoff idempotente e registrar ID/status devolvidos. |

## 2. Jornada mínima do vendedor

1. Entrar com perfil de vendedor e visualizar sua fila.
2. Abrir o lead, empresa e contatos; registrar tentativa de contato e consultar o histórico.
3. Alterar o funil: `Novo → Contato → Interessado → Proposta → Checkout enviado → Pago → Handoff → Concluído`, ou `Perdido` com motivo obrigatório.
4. Consultar a recomendação explicável e alterá-la manualmente se necessário.
5. Selecionar produto e plano comercial disponível; ver somente preço autorizado e condição de venda.
6. Criar pedido e enviar o checkout externo associado.
7. Acompanhar o pagamento confirmado por webhook, a comissão e o handoff/retorno de status.
8. Consultar a próxima ação e o histórico completo do lead e pedido.

## 3. Dados mínimos

| Entidade | Dados obrigatórios |
|---|---|
| Lead | `lead_id`, nome ou empresa, telefone original e normalizado quando houver, e-mail quando houver, origem, consentimento/opt-out quando aplicável, proprietário e histórico. |
| Empresa/cliente | `customer_id`, razão/nome comercial, documento quando aplicável, contatos e relação com leads. |
| Oportunidade | `opportunity_id`, lead/cliente, vendedor, etapa, produto recomendado, motivo, próxima ação e motivo de perda quando perdida. |
| Catálogo comercial | `product_id`, `plan_id`, referência externa do produto, nome, descrição/escopo, preço, moeda, recorrência, condição de venda, status comercial e regra de disponibilidade. |
| Pedido | `seller_order_id`, cliente, oportunidade, vendedor, produto, plano, preço autorizado, desconto, moeda, checkout URL, status de pagamento e `correlation_id`. |
| Pagamento | `payment_id`, provedor, `external_order_id`, evento autenticado, valor, moeda, status, recebido em e chave de idempotência. |
| Comissão | venda paga, vendedor, regra/versionamento, valor, moeda e estado de conciliação. |
| Handoff | produto-alvo, pedido Seller, payload mínimo, `idempotency_key`, tentativas, última falha, ID externo e status externo. |

## 4. Recomendação Lead × Produto v1

As regras devem ser editáveis, versionadas e guardar os sinais que levaram ao resultado. Não usa modelo opaco.

| Resultado | Sinais mínimos |
|---|---|
| DattaVPS | servidor 24h, Docker, automação self-hosted, agente, MT5, VPS ou ambiente dedicado. |
| DattaSeg | agentes, n8n, Make, Zapier, credenciais sensíveis, automações com acesso a sistemas ou preocupação com controle/permissão/exposição. |
| Ambos | ao menos um sinal de cada grupo. |
| Sem recomendação | nenhum sinal suficiente. |

O vendedor pode manter, trocar ou remover a recomendação e deve registrar o motivo da alteração.

## 5. Pipeline comercial e de entrega

O pipeline comercial termina na venda paga. O pedido/entrega possui estado próprio:

`Aguardando pagamento → Pago → Handoff pendente → Handoff enviado → Onboarding/Provisionamento → Em entrega → Aguardando cliente → Entregue`

Falhas de integração ficam visíveis como `Bloqueado`, com causa, tentativas, correlação e próxima ação. Elas não mudam silenciosamente o plano ou a oferta.

## 6. Contratos de integração

### DattaSeller → DattaVPS

Somente após pagamento confirmado, o Seller enviará um pedido por API/evento que contenha:

```json
{
  "seller_order_id": "string",
  "customer_id": "string",
  "product_id": "dattavps",
  "plan_id": "string",
  "region": "string|null",
  "amount": 0,
  "currency": "USD",
  "payment_status": "paid",
  "correlation_id": "string",
  "idempotency_key": "string"
}
```

O DattaVPS deverá responder de forma idempotente com seu `external_order_id` e estado. O contrato ainda está bloqueado: não há endpoint de criação, disponibilidade, catálogo/preço comercial, callback ou POC real de provisionamento publicados.

### DattaSeller → DattaSeg

Somente após pagamento confirmado, o Seller enviará um handoff com `seller_order_id`, cliente, vendedor, produto/plano, preço/moeda, requisitos comerciais, `correlation_id` e `idempotency_key`. DattaSeg deverá devolver um identificador e estado de onboarding.

Até que exista uma API, o Seller poderá manter uma ordem de handoff estruturada e rastreável; isso não constitui onboarding técnico. Hoje o contrato está bloqueado porque DattaSeg não publicou checkout, onboarding ou interface de integração verificável.

## 7. Segurança e operação

- Perfis mínimos: Admin, Vendedor, Financeiro e Operação.
- Vendedor não acessa segredos, banco, painéis financeiros ou administração dos produtos.
- Webhooks precisam de autenticação, validação de assinatura, armazenamento do evento e idempotência.
- Cada evento, pedido e handoff usa `correlation_id`; cada operação externa usa `idempotency_key` estável.
- Retries são controlados, registram tentativa/erro e não geram duplicação.
- Integrações são por API/evento/webhook; não há acesso banco-a-banco entre produtos.

## 8. Fora do MVP

- Provisionamento, fornecedor, hypervisor, rede, IP, backup e operação DattaVPS.
- Scanner, vault, políticas, approval, isolamento de tenant e operação DattaSeg.
- IA de recomendação não explicável.
- Console administrativo de pagamento para vendedor.
- Envio automático de mensagens na importação de leads.

## 9. Critérios de aceite do MVP

O MVP será considerado pronto somente quando uma pessoa puder importar leads, entrar como vendedor, trabalhar um lead, selecionar DattaVPS ou DattaSeg, criar pedido, gerar checkout, receber confirmação real de pagamento, registrar comissão, disparar o handoff, acompanhar seu estado e consultar todo o histórico. Testes E2E dos dois produtos devem repetir o evento de pagamento e comprovar que há exatamente um pedido/onboarding externo.

## 10. Dependências externas atuais

| Produto | Dependência | Estado observado | Consequência para o Seller |
|---|---|---|---|
| DattaVPS | POC OVHcloud e credenciais (DVPS-067) | Bloqueado | Sem disponibilidade/provisionamento real. |
| DattaVPS | Paymenter (DVPS-005), catálogo/preço (DVPS-034), checkout (DVPS-035) | Backlog | Sem plano vendável, checkout ou preço autorizado. |
| DattaVPS | API Seller e callback de status | Não publicada | Integração CCD-43 bloqueada. |
| DattaSeg | Checkout/billing (DS-024) | Backlog | Sem checkout válido. |
| DattaSeg | Onboarding direto (DS-026) e contrato de integração | Backlog/não publicado | Integração CCD-44 bloqueada para automação. |
