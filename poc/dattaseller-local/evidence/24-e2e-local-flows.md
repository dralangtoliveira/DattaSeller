# E2E local — DS-MVP-43 e DS-MVP-44

Data: 2026-09-13.

Comando: `python app/e2e_local.py`

Resultado: `E2E LOCAL OK: Datta360, DattaVPS mock e negativo`.

| Fluxo | Estados confirmados |
|---|---|
| Datta360 | qualificação → diagnóstico → social → preview/edição → proposta → e-mail aprovado/enviado/resposta positiva → pedido → checkout concluído → pagamento aprovado → contrato → handoff entregue → receita/custo/margem/comissão |
| DattaVPS mock | recomendação explicada → proposta → e-mail → pedido → checkout → pagamento aprovado → handoff enviado |
| Negativo | bounce → checkout abandonado → pagamento recusado → handoff rejeitado; sem receita ou comissão válida |

Todos os dados são fixtures `local.invalid`, sem rede, cartão, e-mail ou API externa. A execução visual pelo dashboard continua separada e pendente de evidência específica.
