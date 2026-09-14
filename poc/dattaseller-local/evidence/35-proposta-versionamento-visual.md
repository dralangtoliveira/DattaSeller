# Verificação visual local — proposta e versionamento

Data: 2026-09-13. Ambiente: dashboard local, dados DEMO.

Na central comercial, foi aberta a proposta em rascunho de `ui-evidence-demo`.
O dashboard exibiu preço-base, preço negociado, desconto, margem, validade,
status e versão. Em **editar**, foram alteradas visualmente as condições para
`Pagamento DEMO revisado visualmente` e a validade para 14 dias.

Após **Salvar nova versão**, a tabela passou de `v1 · draft` para
`v2 · draft`, a validade foi atualizada para `2026-09-27` e o editor exibiu a
nova versão. O núcleo valida preço/desconto, recalcula margem e bloqueia revisão
de proposta aceita. O teste unitário cobre versão 2, desconto, margem,
persistência e evento `proposal.revised` na timeline; a suíte Python passou com
10 testes.
