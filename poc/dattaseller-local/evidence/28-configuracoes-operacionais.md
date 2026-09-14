# Verificação visual — Configurações operacionais

Data: 2026-09-13. Dashboard local em `http://127.0.0.1:8765`.

A tela **Configurações** foi aberta visualmente e apresentou:

- empresa, vendedor, telefone, WhatsApp, região e idioma;
- provider de e-mail local (`mock`), remetente e reply-to;
- prazo de follow-up e limites por hora/dia;
- indicadores SPF, DKIM e DMARC, apenas como estado declarativo local;
- seletor claro de Modo DEMO/Local e explicação de que senha, token e chave
  não são persistidos na POC;
- o catálogo comercial já aprovado de DS-MVP-06, com preço, custo, comissão,
  desconto máximo, moeda, condições e estado ativo/inativo.

Persistência: `test_settings_and_products_persist` passou na suíte Python
10/10, incluindo remetente, follow-up e modo DEMO. A API aceita somente a
lista permitida de campos e ignora chaves que pareçam segredo.
