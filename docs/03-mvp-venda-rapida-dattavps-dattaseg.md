# DattaSeller — MVP Venda Rápida DattaVPS + DattaSeg

## Meta
Colocar o DattaSeller em condição de uso comercial rápido com leads próprios para vender DattaVPS e DattaSeg, sem esperar a construção completa da central comercial.

## Regra de fronteira entre projetos
Este MVP **não substitui, copia nem reabre trabalho** que já pertence aos boards de execução do DattaVPS ou do DattaSeg.

A separação oficial é:
- **DattaSeller:** leads, CRM, fila do vendedor, catálogo comercial, recomendação Lead × Produto, pedido comercial, checkout, confirmação de pagamento, comissão e acompanhamento do handoff.
- **DattaVPS:** construção do produto VPS, fornecedor, provisionamento, infraestrutura, painel, operação, entrega técnica e demais cards do board próprio do DattaVPS.
- **DattaSeg:** construção do produto de segurança, scanner, cofre, aprovação, políticas, onboarding técnico, operação e demais cards do board próprio do DattaSeg.

O DattaSeller pode conter cards que mencionem DattaVPS ou DattaSeg apenas quando a entrega for:
1. representação comercial do produto dentro do Seller; ou
2. integração entre sistemas; ou
3. validação E2E da integração.

Se durante a execução do DattaSeller for identificada uma funcionalidade ausente no DattaVPS ou DattaSeg, o card do Seller **não deve implementar essa funcionalidade dentro do outro produto**. Deve registrar a dependência e apontar para o card correspondente no board proprietário. Se não existir card correspondente, deve ser proposta a criação no board proprietário, não no DattaSeller.

## Fluxo mínimo
Lead próprio → CRM/fila do vendedor → escolha DattaVPS ou DattaSeg → oportunidade → pedido → checkout → pagamento confirmado → comissão → handoff pós-venda.

## Reuso de cards existentes
O MVP reaproveita cards já existentes do próprio DattaSeller de fundação, CRM, leads, catálogo, match, checkout, comissão, pipeline de entrega e validação E2E. Não devem ser recriados cards com a mesma entrega.

Cards do DattaVPS e DattaSeg não são copiados para este board.

## Cards específicos adicionados
1. Configurar oferta comercial DattaVPS no DattaSeller — somente representação comercial no Seller.
2. Configurar oferta comercial DattaSeg no DattaSeller — somente representação comercial no Seller.
3. Integrar venda paga DattaSeller → DattaVPS — card de integração.
4. Integrar venda paga DattaSeller → DattaSeg — card de integração.
5. Validar E2E venda DattaVPS pelo DattaSeller — validação da integração, não construção do DattaVPS.
6. Validar E2E venda DattaSeg pelo DattaSeller — validação da integração, não construção do DattaSeg.

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

## Contrato DattaSeller → DattaSeg
Uma venda paga de DattaSeg deve gerar um handoff/onboarding rastreável no fluxo já definido pelo projeto DattaSeg. O Seller não implementa internamente as funções de segurança do DattaSeg.

## Critério de MVP funcionando
O MVP só pode ser considerado concluído quando existirem duas execuções reais e rastreáveis em ambiente autorizado:

- lead → DattaVPS → checkout → pagamento de teste → integração com o fluxo já existente do DattaVPS → status retornado;
- lead → DattaSeg → checkout → pagamento de teste → integração com o fluxo já existente do DattaSeg → status retornado.

Mock, documentação ou cadastro de produto isolado não bastam para encerrar o MVP.

## Regra para bloqueios entre boards
Se a integração depender de entrega ainda não concluída no DattaVPS ou DattaSeg:
- marcar o card de integração do Seller como bloqueado;
- registrar exatamente qual card do board proprietário é a dependência;
- não duplicar a implementação no Seller;
- retomar somente quando a interface necessária estiver disponível ou houver contrato temporário de integração aprovado.
