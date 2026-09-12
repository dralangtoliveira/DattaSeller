---
name: prospector-contrato
description: Gera o contrato de prestação de serviço quando um cliente fecha — minuta em folha A4 imprimível + versão Word (.docx) TRAVADA em que o cliente só preenche os campos liberados (CPF/CNPJ, data, assinatura) — e deixa o rascunho do e-mail pronto. Use quando o usuário disser "fechou", "gerar contrato", "formalizar", "enviar contrato".
---

# Contrato do cliente fechado

Duas versões a partir de `references/contrato-template.html` e `references/gerar-docx.py`.

## Dados

- **Contratado(a)** (o usuário): lidos das Configurações do CRM (`prospector-config.json`, bloco `contratante`) — preenchidos uma vez, entram sozinhos.
- **Cliente**: nome/serviço/valor vêm do CRM (o valor do card fechado). CPF/CNPJ e endereço: peça ao usuário (que pede ao cliente via WhatsApp e cola a resposta — extraia e salve no lead). O que faltar sai como "preencher" destacado.
- Valores, prazos e formas de pagamento vêm SEMPRE do usuário/CRM — nunca invente.

## Geração

1. **Folha**: preencha o template e salve `sites/[slug]/contrato-[slug].html` — A4 real, imprimível, com a barra de impressão. Ela aparece na aba Contratos do CRM (ver/imprimir).
2. **Word travado**: rode `gerar-docx.py` (requer python-docx: `pip install python-docx`) — gera `contrato-[slug].docx` com proteção somente-leitura e APENAS os campos do cliente editáveis (destacados em amarelo). Teste a proteção antes de entregar.
3. **E-mail**: rascunho no app de e-mail com texto curto e profissional + orientação pra anexar o .docx. Status do contrato no CRM → `enviado`. Quando voltar assinado: salve como `contrato-[slug]-assinado.docx` e marque `assinado`.

## Transparência obrigatória

A minuta contém (e NUNCA remova) o aviso de rodapé: é um modelo-base — recomende revisão e, em contratos maiores, um advogado.


## Regra de execução (NÃO NEGOCIÁVEL)

Esta skill é um PROCEDIMENTO, não uma referência: siga TODOS os passos na ordem, sem improvisar nem pular etapas "para simplificar". É PROIBIDO encerrar a resposta com qualquer entrega listada acima pendente — se faltar, gere agora. Toda mudança de status de lead DEVE ser gravada no leads.md E no CRM local antes de encerrar, terminando com a confirmação "CRM atualizado: [N] leads".
