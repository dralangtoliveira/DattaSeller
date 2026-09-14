# E2E visual B — DattaVPS mock local

Data: 2026-09-13. Execução no dashboard local, sem integração com DattaVPS.

## Fluxo executado

1. Criado o lead `dattavps-visual-demo` pela tela **Clientes**, a partir de fonte deliberadamente fictícia `example.invalid`.
2. Em **Editar**, persistidos `product_suggested=DattaVPS`, motivo “Infraestrutura simples e custo previsível” e próxima ação.
3. Em **Central comercial**, selecionados o lead e o catálogo `DattaVPS — DEMO / TESTE`; criada proposta base/negociada de **R$190,00**, margem **R$135,00**.
4. Criado rascunho; executados revisão, aprovação, envio mock e resposta positiva. O histórico mostrou os cinco eventos ordenados.
5. Criado pedido `ord_2d6eb8b6898e`; checkout mock aberto e concluído; pagamento aprovado.
6. Handoff mock criado e entregue visualmente.
7. Em **Financeiro**, a comissão exibiu: `Vendedor DEMO — base R$190,00 · 12% = R$22,80`; MRR ficou em R$190,00. Os totais também incluem a venda Datta360 positiva já existente, como esperado da base persistente.

## Resultado

Todos os adaptadores exibidos são `MockDattavpsAdapter`; nenhuma requisição foi feita a DattaVPS ou a provider de e-mail/pagamento.

Cobertura de apoio: `e2e_local.py` cobre o caminho DattaVPS mock em base temporária, e a suíte `test_dattaseller_local.py` está em 10/10.
