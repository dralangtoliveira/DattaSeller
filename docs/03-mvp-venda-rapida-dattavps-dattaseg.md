# DattaSeller — MVP Venda Rápida DattaVPS + DattaSeg

## Meta
Colocar o DattaSeller em condição de uso comercial rápido com leads próprios para vender DattaVPS e DattaSeg, sem esperar a construção completa da central comercial.

## Fluxo mínimo
Lead próprio → CRM/fila do vendedor → escolha DattaVPS ou DattaSeg → oportunidade → pedido → checkout → pagamento confirmado → comissão → handoff pós-venda.

## Reuso de cards existentes
O MVP reaproveita cards já existentes de fundação, CRM, leads, catálogo, match, checkout, comissão, pipeline de entrega e validação E2E. Não devem ser recriados cards com a mesma entrega.

## Cards específicos adicionados
1. Configurar oferta comercial DattaVPS no DattaSeller.
2. Configurar oferta comercial DattaSeg no DattaSeller.
3. Integrar venda paga DattaSeller → DattaVPS.
4. Integrar venda paga DattaSeller → DattaSeg.
5. Validar E2E venda DattaVPS pelo DattaSeller.
6. Validar E2E venda DattaSeg pelo DattaSeller.

## Contrato DattaSeller → DattaVPS
Uma venda paga de DattaVPS deve gerar exatamente um pedido/handoff no DattaVPS. O contrato deve ser idempotente e rastreável.

Payload mínimo sugerido:
- order_id do DattaSeller;
- customer_id e dados necessários do cliente;
- product/plan_id do DattaVPS;
- região, quando aplicável;
- valor e moeda;
- payment_status;
- correlation_id/idempotency_key.

O DattaVPS deve retornar ao menos um identificador do pedido/serviço e seu estado para o DattaSeller.

## Critério de MVP funcionando
O MVP só pode ser considerado concluído quando existirem duas execuções reais e rastreáveis em ambiente autorizado:

- lead → DattaVPS → checkout → pagamento de teste → pedido/handoff DattaVPS criado uma única vez → status retornado;
- lead → DattaSeg → checkout → pagamento de teste → onboarding/ordem operacional criado uma única vez → status retornado.

Mock, documentação ou cadastro de produto isolado não bastam para encerrar o MVP.
