# E2E visual — comparador antes/depois

Data: 2026-09-13. Cenário DEMO local: `http-demo-lead`.

O lead foi marcado como redesenhado e recebeu apenas uma URL de origem
fictícia (`https://example.invalid`) para exercitar a tela sem consultar ou
alterar um site externo.

No dashboard, a aba **Comparador** exibiu:

- o seletor do lead `HTTP Demo Lead`;
- a coluna **Antes — site atual**, com link seguro para abrir quando o iframe
  externo não puder renderizar;
- a coluna **Depois — preview local persistido**;
- no iframe Depois, o título, corpo, CTA e contato que foram revisados no
  E2E de preview;
- aviso explícito sobre possíveis bloqueios de iframe no lado Antes.

O comparador usa o registro persistido em `ds_previews`; não cria nem publica
uma página externa.
