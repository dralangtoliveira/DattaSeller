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
`skills/prospector-contrato/references/gerar-docx.py` e está exposto por
**baixar DOCX** no dashboard. O download local gerou um arquivo de 38.207 bytes
e o teste do núcleo validou o arquivo acima de 1 KB.

## Bloqueio externo comprovado de QA raster

O renderizador documental oficial foi executado sobre o DOCX baixado, mas
interrompeu com `FileNotFoundError: LibreOffice soffice.exe was not found on
PATH`. A inspeção raster exigida não pode ser concluída porque o runtime de
documentos fornecido não inclui o binário LibreOffice, confirmado também por
busca direta em `C:\Users\dr_al\.cache\codex-runtimes`. Não foi usada uma
instalação externa nem credencial. A funcionalidade local continua testada e
operável; apenas esta evidência raster permanece bloqueada pelo ambiente.
