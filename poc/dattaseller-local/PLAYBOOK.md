# Playbook operacional local

Todos os comandos abaixo operam somente no computador local e usam mocks.

1. **Testar:** `python app/prospector-mcp.py --teste`, `python app/test_dattaseller_local.py -v` e `python app/e2e_local.py`.
2. **Iniciar:** `python app/dashboard-server.py`, depois abrir `http://127.0.0.1:8765`.
3. **Prospectar/importar:** abra **Clientes**, crie o lead com nome, contato público e URL de fonte; e-mail não é obrigatório.
4. **Qualificar:** em **Diagnóstico**, registre fatos separados de hipóteses e escolha Datta360, DattaVPS, DattaSeg, DattaHost ou recomendação insuficiente.
5. **Diagnosticar/redesenhar:** registre somente observações factuais; gere preview local e use o comparador antes/depois. Edite título, CTA e contato somente após revisão humana.
6. **Propor e enviar mock:** em **Central comercial**, crie proposta, rascunho, revise, aprove e envie/simule individualmente.
7. **Fechar localmente:** crie pedido, abra/conclua checkout mock, aprove pagamento mock, gere contrato e envie handoff mock. Não informe cartões nem conecte providers reais.
8. **Acompanhar:** use Timeline, Financeiro e Follow-ups. O reset DEMO remove transações de produtos DEMO, preservando configurações e dados não DEMO.

Troca futura de mocks por Resend, SMTP, DattaVPS ou DattaSeg deve ocorrer por adapter; não recrie CRM, SQLite ou o fluxo comercial.
