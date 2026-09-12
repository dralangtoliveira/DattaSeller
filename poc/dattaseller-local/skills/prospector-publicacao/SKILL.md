---
name: prospector-publicacao
description: Publica os sites redesenhados dos clientes usando o ChatGPT Sites (hospedagem nativa com URL compartilhável e domínio personalizado). Use quando o usuário pedir "publicar", "colocar no ar", "subir os sites", "gerar o link do cliente". Publica página + página-capa da proposta, valida o acesso público e atualiza o CRM.
---

# Publicação via ChatGPT Sites

Colocar no ar a página redesenhada e a página-capa da proposta de cada cliente, com URL pública compartilhável — sem hospedagem externa, sem FTP.

## Fluxo por cliente

1. **Gere a página-capa** `sites/[slug]/proposta.html` a partir de `references/capa-proposta-template.html` (da skill prospector-proposta): substitua os placeholders com os dados do lead + assinatura do config. É ela que vai no e-mail.
2. **Crie o site no ChatGPT Sites**: use a função Sites (criar site) com os arquivos do cliente — a página principal como index e a capa como `/proposta`. Nomeie o projeto com o slug do cliente.
3. **Publique como "qualquer pessoa na internet"** (não deixe restrito "só você" — o cliente precisa abrir sem login). Se a publicação falhar/ficar em processamento, tente novamente e confirme no painel Sites antes de considerar publicado.
4. **Valide de verdade**: abra a URL pública em aba anônima/sem login e confirme que página e capa carregam. URL que exige login NÃO é entrega.
5. **Domínio personalizado (recomendado)**: nas configurações do site em Sites → Adicionar domínio, oriente o usuário a conectar o domínio próprio dele — link com a marca do usuário converte mais que subdomínio genérico. A URL final (site + capa) vai pro leads.md e pro CRM com status `publicado`.

## Regras

- Link enviado a cliente precisa abrir SEM login, com HTTPS válido e de preferência no domínio do usuário.
- Um site por cliente (projeto separado no Sites) — facilita analytics por cliente e exclusão futura.
- Aproveite o analytics do Sites: visitas na capa = cliente abriu a proposta (informe isso ao usuário no follow-up).
- Se o plano do usuário ainda não tem Sites (beta), avise e ofereça alternativa temporária: rodar localmente + hospedagem própria do usuário.

Próximo passo: enviar as propostas por e-mail.


## Regra de execução (NÃO NEGOCIÁVEL)

Esta skill é um PROCEDIMENTO, não uma referência: siga TODOS os passos na ordem, sem improvisar nem pular etapas "para simplificar". É PROIBIDO encerrar a resposta com qualquer entrega listada acima pendente — se faltar, gere agora. Toda mudança de status de lead DEVE ser gravada no leads.md E no CRM local antes de encerrar, terminando com a confirmação "CRM atualizado: [N] leads".
