# Verificação visual local — contrato

Data: 2026-09-13. Ambiente: `http://127.0.0.1:8765`; todos os dados usados são DEMO.

## Fluxo executado

1. foi criado visualmente o pedido `ord_f2506b6131f3` para a proposta DEMO
   `http-demo-lead`;
2. **Gerar** criou o contrato `contract_54509311322a` com status `generated`;
3. **Ver minuta** abriu, no próprio dashboard, o HTML do template original
   `prospector-contrato/references/contrato-template.html`, com os valores
   substituídos e os campos ainda não confirmados identificados como
   `preencher`;
4. **Enviar** alterou o estado para `sent_simulated`;
5. **Assinar** alterou o estado para `signed`.

A consulta à timeline local confirmou os eventos persistidos
`contract.generated`, `contract.sent_simulated` e `contract.signed` nesta
ordem. A interface também expõe **recusar** e **cancelar** para o cenário
negativo.

## Cobertura

O teste unitário do núcleo valida geração da minuta, ausência de placeholders,
transição para envio simulado e assinatura. A suíte Python passou com 10 testes.

O gerador DOCX original do Prospector foi preservado em
`skills/prospector-contrato/references/gerar-docx.py`; sua exposição como
download visual permanece a pendência explícita do grupo DS-MVP-32–33.
