# Revisão adversarial OPS-COUPON-001 — teto do preço público

Data: 2026-09-17. Escopo da revisão: a linha do cupom do Release Candidate
(`207a870`, PR #10), com foco em dinheiro, autorização e integridade. A revisão
foi feita contra o commit, não contra a descrição do card.

## Achado P2 — a criação da proposta não validava o teto do preço público

**Onde:** `app/api/[...path]/route.ts`, ramo `POST` de `proposals`
(no commit `207a870`, linha 125).

**O que estava errado:** a revisão de proposta (`PUT proposals/:id`) passou a
usar `negotiatedPriceError`, que aplica três regras (preço positivo, teto do
preço público, desconto máximo do produto). A *criação* de proposta continuou
com a guarda antiga, que só verifica preço positivo e desconto máximo:

```ts
if (price <= 0 || discount > base * Number(product.max_discount_pct) / 100) return out({ ... }, 400);
```

Como `discount = base_price - negotiated_price`, um preço **acima** do
preço-base produz desconto negativo, que nunca é maior que o limite e portanto
**passa** pela guarda antiga.

**Reprodução** (helper do próprio RC `207a870`, produto `public_price = 100`,
`base_price = 100`, `max_discount_pct = 20`):

```
price=120 | guarda atual do POST /proposals: ACEITA (cria proposta) | helper: negotiated_price_above_public_price | constraint do banco satisfeita? false
price=100 | guarda atual do POST /proposals: ACEITA (cria proposta) | helper: ok                                | constraint do banco satisfeita? true
price=90  | guarda atual do POST /proposals: ACEITA (cria proposta) | helper: ok                                | constraint do banco satisfeita? true
price=79  | guarda atual do POST /proposals: 400 Preço inválido...  | helper: discount_above_max                 | constraint do banco satisfeita? true
```

**Impacto real:** a invariante "o preço negociado nunca passa do preço
público" era garantida apenas pela constraint `ds_orders_public_price_ceiling`
no momento de gravar o **pedido**. O efeito era um pedido recusado pelo banco e
traduzido pelo código para `storageUnavailable()` — ou seja, um HTTP 500
"armazenamento indisponível" para um erro que é de validação, depois de a
proposta já ter sido aceita. Não havia perda de dinheiro (o banco barrava),
mas havia inconsistência de contrato e erro enganoso em um caminho financeiro.

## Correção aplicada

Commit `5bade0c` em `codex/ops-coupon-001` (PR #10) e cherry-pick `de2c228` em
`codex/release-candidate-final-gate`:

1. `POST /proposals` passa a usar `negotiatedPriceError` com
   `publicPrice: product.public_price`, preservando as duas mensagens legadas
   (`negotiated_price_not_positive`, `discount_above_max` → "Preço inválido ou
   desconto acima do máximo") e devolvendo `negotiated_price_above_public_price`
   como código próprio, do mesmo jeito que o `PUT` já fazia.
2. `createOrder` repete a validação antes do `insert` e devolve 400 com o
   motivo. Isso cobre propostas antigas, criadas antes da correção, que de
   outra forma só falhariam no banco como um 500 opaco.
3. Dois testes novos em `test/coupon.test.js` cobrem os dois pontos por seção
   do arquivo de rota (a rota não é importável em teste unitário) e verificam a
   ordem: a checagem precisa acontecer antes do `insert` do pedido.

Evidência: `node --experimental-strip-types --test` passou de 64 para 66 testes
na linha do cupom e de 69 para 71 no RC, sem falha; `tsc --noEmit` exit 0;
`git diff --check` exit 0; build da Vercel `success` para `de2c228` (ver
`docs/VERIFICACAO-RC-FINAL-GATE-2026-09-17.md`).

## Confirmado OK na revisão

- Todos os verbos da rota (`GET`, `POST`, `PUT`, `DELETE`) exigem sessão:
  `context()` devolve 401 quando não há autenticação, inclusive no `POST` que
  cria a proposta e no que cria o pedido.
- `negotiatedPriceError` trata `NaN`/`Infinity` como preço inválido (o
  `number()` devolve `null`), e o desconto é arredondado a 2 casas.
- O cupom só é emitido quando existe desconto (`required`), o produto sem
  `checkout_url` emite cupom sem inventar URL, e `javascript:`/`file:` são
  recusados por `isPublicCheckoutUrl`.
- A migration usa `add column if not exists` e as constraints são criadas
  dentro de um `do $$` com verificação por `pg_constraint`, o que a torna
  reexecutável.

## Riscos residuais registrados (não corrigidos neste ciclo)

1. **P1 de negócio — o checkout oficial ainda não homologou cupom.** O adapter
   é o próprio `checkout_url` do fornecedor com o parâmetro `coupon`. Se o
   fornecedor ignorar o parâmetro, o cliente paga o preço público, e não o
   negociado. Está documentado como integração pendente em
   `docs/OPS-COUPON-001-REGRA-E-ADAPTER-2026-09-17.md`, mas é risco de receita
   em venda negociada e depende de homologação externa.
2. **P3 — não há idempotência na criação do pedido.** Chamar `POST /orders`
   duas vezes para a mesma proposta cria dois pedidos e dois cupons. O cupom é
   derivado do id do pedido, então cada pedido tem o seu. É comportamento
   pré-existente à linha do cupom; passa a ter efeito financeiro agora.
3. **P3 — `coupon_status` nunca sai de `issued`.** Nada no código marca
   `applied`; a lista fechada no banco aceita os três valores, mas só um é
   escrito. Documentado como evolução, não como requisito do card.
4. **P3 — divergência entre `discount` do pedido e desconto do cupom.** O
   desconto do cupom é `public_price - negotiated_price`, enquanto o campo
   `discount` do pedido é `base_price - negotiated_price`. Se um produto tiver
   `public_price` diferente de `base_price`, os dois números divergem (o efeito
   no caixa continua correto, porque o cupom é calculado contra o preço
   público). A verificação de dados em Production cobre esse caso.
