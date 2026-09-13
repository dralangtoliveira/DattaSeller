# DattaSeller local

MVP local derivado do Prospector, com SQLite, dashboard e MCP. A origem integral está em `vendor/prospector-original`; ela não deve ser editada.

## Preparar e executar

1. Instale Python 3.12 e `mcp[cli]` se desejar usar o MCP.
2. Copie `app/prospector-config.example.json` para `app/prospector-config.json`. Preencha os dados do contratado; deixe a oferta DattaVPS desabilitada até receber nome, descrição, preço, disponibilidade e URL oficial aprovados.
3. Execute `app/iniciar-dashboard.bat` ou `python app/dashboard-server.py`.
4. Abra `http://127.0.0.1:8765`.

O banco é criado em `data/dattaseller-local.db`. Dashboard, MCP e o núcleo comercial usam esse mesmo arquivo SQLite.

## Ciclo comercial local (DEMO / TESTE)

O servidor disponibiliza adapters locais e persistentes para demonstrar o ciclo sem qualquer serviço externo: `proposta → e-mail em rascunho → aprovado → enviado/simulado → pedido → checkout mock → pagamento mock → contrato → handoff mock → financeiro`.

- `GET /api/settings`, `PUT /api/settings`: configurações gerais. Campos com `secret`, `key` ou `password` são rejeitados e segredos não são persistidos.
- `GET /api/products`, `PUT /api/products/:id`: catálogo desacoplado. Os quatro produtos iniciais são marcados explicitamente como `DEMO / TESTE`; preço, custo, comissão, desconto máximo e recorrência são persistidos.
- `POST /api/proposals`, `/api/emails`, `/api/orders`: cria os artefatos comerciais no mesmo banco do CRM.
- `POST /api/orders/:id/checkout`, `/payment`, `/contract`, `/handoff`: executa apenas mocks locais. Pagamento não coleta cartão nem acessa uma API externa.
- `GET /api/financial` e `/api/timeline`: resumo persistido e histórico auditável.
- `POST /api/demo/reset`: remove somente os artefatos transacionais de demonstração; mantém configurações, catálogo e leads.

No MCP, além dos comandos Prospector preservados, estão disponíveis `listar_produtos`, `criar_proposta`, `preparar_email`, `transicionar_email`, `criar_pedido`, `processar_pagamento_mock`, `gerar_contrato` e `resumo_financeiro_local`.

## Operar a fila

1. Defina nicho, cidade/região, produto preferencial, meta de leads e limite de resultados.
2. Use `skills/prospector-prospeccao/SKILL.md` para pesquisar somente fontes públicas. Cada registro precisa de `source_url`, `source_checked_at`, canal público, razão verificável, produto sugerido e próxima ação.
3. Abra **Pipeline** para operar `novo → redesenhado → publicado → proposta → respondeu → fechado`; use `descartado` com motivo para candidatos sem aderência, contato público ou fonte verificável.
4. Selecione três leads para auditoria de site e um deles para o caso completo. Use as skills prontas de redesign, Instagram, publicação e proposta; registre os JSONs da auditoria em **✎ dados**.
5. Revise conteúdo, escopo, preço, prazo e mensagem antes de qualquer apresentação. O sistema não envia contato automaticamente.
6. Para DattaVPS, configure a oferta em **Configurações**. No card aderente, registre primeiro **apresentar DattaVPS**; depois o link de checkout fica disponível e o clique é gravado separadamente.
7. Para fechar, informe valor positivo e confirme manualmente. Marque pagamento, handoff e entrega somente após comprovação externa.

## Verificar

- `python app/prospector-mcp.py --teste`
- `python app/dattaseller_local.py` (E2E local completo, isolado e sem rede)
- `node evidence/verify-responsive.cjs` com Playwright disponível em `NODE_PATH`
- `node evidence/verify-dattavps.cjs` com o dashboard em execução

O checkout DattaVPS permanece desabilitado enquanto a configuração oficial estiver incompleta. Contato externo, publicação, proposta e fechamento exigem aprovação humana explícita.

Providers futuros (`Resend`, `Brevo`, `Gmail`, `SMTP`, DattaVPS e DattaSeg) continuam fora do MVP local: devem substituir os mocks por adapters, não reimplementar o CRM ou o banco.
