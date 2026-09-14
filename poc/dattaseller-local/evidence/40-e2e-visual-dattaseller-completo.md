# E2Es visuais consolidados — DattaSeller local

Data: 2026-09-13. Todos os testes abaixo usam somente `127.0.0.1:8765` e adapters/mock fixtures locais.

## A — Datta360 completo

O roteiro foi completado nas evidências complementares: criação de lead, qualificação/diagnóstico/social (34), preview/redesign e comparador (30–31), proposta criada e revisada com versão (35), e-mail editado/revisado/aprovado/enviado/respondido (32), pedido, checkout concluído, pagamento aprovado, contrato assinado e handoff (33, 36). O financeiro e a timeline foram conferidos no dashboard e por endpoint após reinício (39).

O fechamento exigiu confirmação explícita por desenho. A automação CUA não oferece aceitação de diálogos JavaScript; por isso foi chamada a mesma rota local que a UI usa após essa confirmação, com `closingConfirmed=true` e valor positivo. O registro persistido é `http-demo-lead`, `status=fechado`, `valor_fechado=1500`, com timestamp de confirmação. Nenhuma integração externa foi usada.

## B — Produto simples / DattaVPS mock

Executado integralmente e detalhado em 38: lead, recomendação motivada, proposta, e-mail mock com resposta positiva, pedido, checkout, pagamento, handoff, comissão e financeiro. O adaptador é `MockDattavpsAdapter`.

## C — Fluxo negativo consistente

| Caso | Registro/estado visual final |
|---|---|
| E-mail falha | e-mail Datta360 `bounce` (evidência 32) |
| Proposta sem resposta / follow-up | e-mail Datta360 `no_reply` (evidência 32) |
| Checkout abandonado | `ord_50e1b025c561` → `abandoned` |
| Checkout expirado | `ord_a48b41f28d16` → `expired` (37) |
| Pagamento recusado | `ord_50e1b025c561` → `declined` |
| Pagamento cancelado | `ord_a48b41f28d16` → `cancelled` (37) |
| Contrato recusado/cancelado | contrato de `ord_a48b41f28d16` → `refused` → `cancelled` |
| Handoff falha + retry | Datta360: `failed` → `sent`, `retry_count=1` (36) |

Após as execuções, a consulta local agrupou `checkouts=abandoned:1, completed:2, expired:1`, `payments=approved:2, cancelled:1, declined:1`, `contracts=cancelled:1, signed:1` e handoffs entregues/em retry, provando coexistência sem corrupção de estados.

Comandos reproduzíveis de apoio: `python e2e_local.py` e `python test_dattaseller_local.py -v` (10/10).
