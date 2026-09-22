# DattaSeller — Security Closing Gate

Data do registro: 2026-09-22  
Status: **PENDENTE / BLOQUEANTE PARA FECHAMENTO DE PRODUCTION**

## Decisão

Segurança passa a ser gate formal de fechamento do DattaSeller. O produto não deve ser marcado como pronto apenas porque os DS-VALUE gates, build, testes, E2E comercial e integrações estejam verdes.

A URL pública do Supabase e a publishable key podem existir no cliente conforme o modelo do Supabase. O controle efetivo deve permanecer em Auth, autorização, RLS, grants, funções/views/RPC e segredos server-side. Secret key / service role não podem aparecer no browser, bundle, source map, logs, respostas HTTP ou repositório.

## Evidência positiva já existente

- 20/20 tabelas `ds_*` com RLS habilitado em HML;
- 20/20 tabelas `ds_*` com RLS habilitado em Production;
- worker exige segredo/token nos fluxos externos e falha fechado;
- proteção SSRF já testada em fluxos de descoberta, browser e redesign;
- capability token da proposta pública com token opaco e somente hash persistido;
- CSP, anti-embedding, noindex/referrer/permissions no fluxo público;
- secret scans repetidamente sem credenciais no código;
- separação HML/Production já praticada.

Essas evidências não encerram o gate porque a auditoria ao vivo encontrou pendências objetivas.

## Achados ao vivo de 2026-09-22

### HML — projeto `qfwvkarvueuezeqfljbl`

1. O Security Advisor apontou **17 tabelas legadas em `public` sem RLS**:
   - `opportunities`
   - `recommendations`
   - `activities`
   - `companies`
   - `leads`
   - `users`
   - `lead_sources`
   - `products`
   - `product_plans`
   - `orders`
   - `payments`
   - `sales`
   - `commissions`
   - `recommendation_feedback`
   - `delivery_orders`
   - `integration_attempts`
   - `audit_events`

2. Na verificação de privilégios, o papel `authenticated` possui privilégios amplos nessas tabelas legadas, incluindo SELECT/INSERT/UPDATE/DELETE em várias delas. Isso deve ser corrigido mesmo que essas tabelas não façam parte do núcleo `ds_*`.

3. A função `public.upsert_lead_identity` foi sinalizada por `function_search_path_mutable`.

4. A proteção contra senha vazada está desabilitada.

### Production — projeto `vkvkzoulbljampcbxaim`

1. A função `public.rls_auto_enable()` foi sinalizada como `SECURITY DEFINER` executável pelos papéis `anon` e `authenticated`.
2. A proteção contra senha vazada está desabilitada.
3. As 20 tabelas `ds_*` verificadas estão com RLS habilitado.

## Pendências obrigatórias

- [ ] **DS-SEC-01 — Tabelas legadas HML:** decidir por tabela entre remover, retirar da Data API, revogar grants ou habilitar RLS com policies corretas; não aplicar política genérica sem validar modelo de acesso.
- [ ] **DS-SEC-02 — Grants:** reduzir privilégios de `authenticated` e `anon` ao mínimo necessário e provar que tabela legada não é acessível indevidamente.
- [ ] **DS-SEC-03 — SECURITY DEFINER:** revisar `public.rls_auto_enable()`; revogar EXECUTE de `anon`/`authenticated`, mover para schema não exposto ou converter para invoker se compatível com a finalidade real.
- [ ] **DS-SEC-04 — search_path:** fixar `search_path` de `public.upsert_lead_identity` de forma segura e revalidar comportamento.
- [ ] **DS-SEC-05 — Cross-user/BOLA:** executar usuário A x usuário B em SELECT/INSERT/UPDATE/DELETE nas tabelas `ds_*` e recursos sensíveis.
- [ ] **DS-SEC-06 — Secrets:** confirmar no SHA final que secret key/service role, Resend, worker tokens e credenciais de providers não chegam ao cliente, logs ou respostas.
- [ ] **DS-SEC-07 — Functions/views/RPC:** auditar funções, views, RPCs, triggers privilegiados e qualquer mecanismo que possa contornar RLS.
- [ ] **DS-SEC-08 — API/web:** revisar rate limiting, validação de entrada, CORS, CSP, headers e CSRF onde aplicável; manter SSRF fail-closed já existente.
- [ ] **DS-SEC-09 — Auth hardening:** revisar proteção de senha vazada, política de senha, revogação/expiração de sessão e MFA para administradores conforme viabilidade do plano.
- [ ] **DS-SEC-10 — Final automated gate:** secret scan + testes de autorização + Security Advisor HML + Security Advisor Production no mesmo ciclo de fechamento.

## Ordem de execução recomendada

1. corrigir primeiro os achados que ampliam privilégio: tabelas legadas sem RLS/grants e `SECURITY DEFINER`;
2. corrigir `search_path`;
3. executar cross-user/BOLA real;
4. endurecer Auth;
5. executar novamente os Security Advisors;
6. só então fechar o gate.

## Critério de conclusão

Este gate somente pode sair de **PENDENTE** quando:

- nenhum ERROR do Security Advisor permanecer sem justificativa técnica documentada;
- WARNs relacionados a execução privilegiada forem tratados ou explicitamente justificados;
- o teste cross-user/BOLA estiver verde;
- secrets permanecerem exclusivamente server-side;
- HML e Production forem rechecados;
- as evidências estiverem vinculadas ao SHA/ambiente de fechamento.

Enquanto isso, `product_ready` deve continuar **false**.
