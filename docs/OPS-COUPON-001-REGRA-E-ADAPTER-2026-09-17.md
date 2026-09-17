# OPS-COUPON-001 — Desconto negociado como cupom até o checkout oficial

Data: 2026-09-17. Escopo já definido pelo responsável: o preço público do site
**não** muda; a proposta negocia apenas **para baixo**; o preço negociado
**nunca** pode passar do preço público; o desconto negociado chega ao checkout
oficial por **cupom**; cada produto mantém o seu próprio checkout; e nenhum
limite máximo de desconto novo é inventado.

## Modelo mínimo

| Campo | Onde vive | Uso |
| --- | --- | --- |
| `public_price` | `ds_products` (existente) e agora também em `ds_orders` | teto do preço negociado e registro do preço público no momento da venda |
| `base_price` | `ds_orders` / `ds_proposals` | preço-base da proposta |
| `negotiated_price` | `ds_orders` / `ds_proposals` | preço negociado, sempre `<= public_price` |
| `discount` | `ds_orders` / `ds_proposals` | diferença entre o preço público e o negociado |
| `coupon_code` | `ds_orders` (novo) | código do cupom emitido para o pedido |
| `coupon_status` | `ds_orders` (novo) | `issued`, `applied` ou `cancelled` |
| `checkout_url` | `ds_products` (existente) | checkout oficial do produto; o cupom é anexado a ele |

## O que foi implementado

- `lib/coupons/coupon.js` — regra pura: valida o teto do preço público, calcula o
  desconto, emite o código `DS-XXXXXXXX` a partir da referência do pedido e monta
  a URL do checkout oficial com o cupom (`coupon` por padrão, ajustável por
  `coupon_param` do produto, sem coluna nova).
- `app/api/[...path]/route.ts` — a revisão de proposta passa a recusar preço
  negociado acima do preço público (`negotiated_price_above_public_price`), e a
  criação de pedido grava `public_price`, `coupon_code` e `coupon_status`,
  emitindo `order.coupon_issued` quando existe desconto.
- `supabase/migrations/20260917000000_add_order_coupon.sql` — colunas novas e a
  garantia no banco: `check (public_price is null or negotiated_price <=
  public_price)` e a lista fechada de status do cupom.

## O que permanece

- O limite de desconto continua sendo o `max_discount_pct` já configurado por
  produto. Nenhum valor novo foi introduzido no código — há teste que verifica
  isso.
- O preço público do site não é alterado em nenhum ponto: o CRM apenas registra
  o teto e emite o cupom.
- Produto sem `checkout_url` configurado emite o cupom e devolve
  `checkout_url_with_coupon: null`. Nenhuma URL é inventada.

## Integração real de checkout

O adapter é o próprio checkout oficial do produto (`checkout_url`), que ainda
não tem homologação de cupom com o fornecedor. O MVP valida a **lógica** por
teste (`test/coupon.test.js`) e não bloqueia o restante do CRM por essa
integração externa, conforme o escopo definido.

## Interface

O cupom e a URL com cupom voltam na resposta de criação do pedido e ficam
gravados na linha do pedido. Expor isso na tela do CRM é evolução, não
requisito deste card.
