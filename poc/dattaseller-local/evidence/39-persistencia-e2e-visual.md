# Persistência após E2E visual

Data: 2026-09-13. O servidor local da porta 8765 foi encerrado e iniciado novamente. Depois do reinício, os endpoints locais retornaram:

| Registro | Valor persistido |
|---|---|
| Lead | `dattavps-visual-demo` com `product_suggested=DattaVPS` |
| Proposta | `accepted/dattavps/R$190` |
| E-mail | `positive_reply`, tentativa `1` |
| Pedido | `paid/ord_2d6eb8b6898e` |
| Checkout | `completed` |
| Pagamento | `approved/R$190` |
| Handoff | `delivered`, retry `0` |

O mesmo reinício retornou configurações DEMO mock, timeline (45 eventos), contratos, comissões e resumo financeiro (`sales=2`, receita R$1690, custo R$455, margem R$1235, MRR R$190, comissão R$172,80). Assim, a verificação inclui os registros requeridos sem depender de memória do processo.

Complemento reproduzível: `test_restart_persists_full_local_flow` usa banco temporário e confirma a persistência de qualificação, diagnóstico, social, preview, proposta, e-mail, pedido, pagamento, contrato, handoff e financeiro.
