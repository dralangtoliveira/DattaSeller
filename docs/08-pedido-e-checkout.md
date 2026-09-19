# Pedido e checkout externo

**Card:** CCD-18  
**Domínio atual:** fluxo de pedidos do CRM  
**Decisão Datta360°:** Asaas Checkout dinâmico por pedido

## Decisão comercial e técnica

O Datta360° não deve usar um `checkout_url` estático por produto. O valor efetivo pode ser negociado no CRM, então o checkout precisa ser criado **depois** que a proposta for aprovada e o pedido existir, usando exatamente o `negotiated_price` salvo no pedido.

Para o Datta360°, o provider definido é **Asaas Checkout**. A integração deverá criar um checkout individual por pedido, usando o identificador do pedido em `externalReference`, e persistir o ID/link retornados pelo Asaas. O cliente recebe a URL hospedada pelo Asaas somente após essa criação.

## Regras de segurança e conciliação

1. A chave do Asaas fica somente no servidor e nunca é exposta ao navegador ou gravada no repositório.
2. O valor enviado ao Asaas deve ser exatamente o valor negociado do pedido aprovado.
3. O pedido interno é criado antes do checkout externo.
4. O retorno síncrono da criação do checkout não confirma pagamento.
5. O estado financeiro deve ser conciliado por **webhook do Asaas**, usando a referência do pedido.
6. Redirecionamentos de sucesso/cancelamento/expiração servem apenas para experiência do cliente e não são prova de pagamento.
7. Sem ID e link de checkout válidos, o pedido permanece sem checkout enviável.
8. Em Sandbox, o fluxo deve ser homologado antes de habilitar Production.

## Impacto no catálogo

Para SKUs Datta360°, `catalog/products.json.checkout_url` permanece `null` de forma intencional: o link não é uma propriedade fixa do produto. Ele será gerado para cada pedido. O campo legado `ds_products.checkout_url` não deve ser usado como fonte de cobrança do Datta360°.

## Gate para Production

A decisão humana sobre o provider está encerrada: **Asaas**. O que resta é implementação e homologação do adapter, configuração segura da credencial, webhook e um E2E de pagamento controlado. Isso é gate técnico, não nova decisão de catálogo.
