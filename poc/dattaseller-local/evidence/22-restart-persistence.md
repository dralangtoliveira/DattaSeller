# Persistência após reinício — DS-MVP-45

Data: 2026-09-13.

Comando executado:

```powershell
python poc/dattaseller-local/app/test_dattaseller_local.py -v
```

Resultado: 10/10 aprovados, incluindo `test_restart_persists_full_local_flow`.

O cenário cria qualificação, diagnóstico, auditoria social, preview editado, proposta, e-mail aprovado/enviado-simulado, pedido, checkout concluído, pagamento aprovado, contrato e handoff entregue. Em seguida fecha a conexão SQLite, reabre o banco e confirma IDs, estados e resumo financeiro (`receita = 100`, `custo = 60`, `margem = 40`, `comissão = 10`).
