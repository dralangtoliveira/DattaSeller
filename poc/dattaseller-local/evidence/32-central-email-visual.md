# Verificação visual local — central de e-mail completa

Data: 2026-09-13. Ambiente: `http://127.0.0.1:8765`, provider exclusivamente mock e dados DEMO.

## Ciclo positivo e follow-up

No dashboard, para a proposta DEMO `prop_21a56707acfe` do lead
`http-demo-lead`, foram executadas visualmente as etapas abaixo:

1. criar rascunho e abrir **editar**;
2. alterar assunto para `Proposta Datta360° — revisão DEMO` e corpo para
   `Olá, segue uma proposta DEMO para revisão humana.`;
3. salvar o rascunho, enviar para revisão e aprovar;
4. simular o envio pelo provider local;
5. simular resposta positiva;
6. registrar ausência de resposta/follow-up.

A própria central exibiu, em ordem inversa, o histórico persistido:
`email.draft`, `email.edited`, `email.reviewed`, `email.approved`,
`email.sent_simulated`, `email.positive_reply` e `email.no_reply`. A interface
mostrou também o contador de tentativas alterado para `1` depois do envio.

## Fluxo negativo

Em um segundo e-mail DEMO já disponível na mesma central, a ação visual
**Falha/bounce** alterou o status para `bounce` e acrescentou
`email.bounce` ao histórico. Nenhuma chamada externa foi feita.

## Regressão automatizada

`test_email_transitions_and_history` em
`app/test_dattaseller_local.py` cobre edição somente em rascunho, bloqueio de
envio antes de aprovação, revisão, aprovação, envio, resposta positiva,
follow-up e bounce. A suíte do núcleo passou com 10 testes.

Os dois registros pertencem ao modo DEMO e são removíveis pela rotina Reset
DEMO; não contém dados pessoais reais.
