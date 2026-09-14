# Verificação visual — catálogo, oferta e CTA

Data: 2026-09-13. Dashboard local em `http://127.0.0.1:8765`.

A área Configurações exibiu, para Datta360, DattaHost, DattaSeg e DattaVPS:

- descrição comercial aprovada;
- CTA editável;
- disponibilidade (`available`, `paused`, `prelaunch`,
  `waiting_configuration` e `unavailable`);
- URL de checkout HTTPS opcional;
- ação individual de salvar oferta;
- catálogo já persistente com preço, custo, comissão, desconto, moeda,
  condições e estado ativo/inativo.

`test_settings_and_products_persist` confirmou que descrição, CTA e
disponibilidade persistem. A mesma cobertura confirma que uma URL HTTP é
rejeitada; o núcleo não abre checkout externo nem realiza cobrança.
