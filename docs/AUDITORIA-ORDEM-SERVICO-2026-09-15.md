# DattaSeller — auditoria da ordem de serviço antes da execução

Base: `e616dbc1fb132cd4f7afff3c311ebce299de4e3e`  
Branch de execução: `hardening/audited-production-fixes`

## Veredito

A ordem de serviço está tecnicamente bem direcionada e deve ser executada, mas **não exatamente como foi escrita**. Há correções críticas que fazem sentido e devem entrar; há também trechos que precisam ser ajustados antes da implementação para não introduzir regressões ou bloquear leads reais.

## Status por lote

### Lote 1 — APROVADO COM AJUSTES OBRIGATÓRIOS

Aprovado:
- adicionar `deleted_at`, `unsubscribed_at`, `unsubscribe_token` e `sent_at`;
- bloquear contrato de produto `is_demo=true`;
- remover fallback `Vendedor DEMO`;
- `event(..., demo=false)` por padrão;
- remover rota/função de reset DEMO;
- exclusão lógica e bloqueio de exclusão de lead com pedido pago;
- corrigir renderização de dados não confiáveis no dashboard.

Não aplicar cegamente:
- preços, custos, comissão e descontos marcados `AJUSTAR`;
- `seller_name` e `email_reply_to` com placeholders;
- `company_name='Datta360°'` sem decisão explícita, porque o CRM DattaSeller é multi-produto;
- `hour_limit` e `day_limit` sem decisão;
- `update ds_timeline set is_demo=false where is_demo=true` sem inspeção prévia dos eventos.

Correção adicional da ordem:
- apenas trocar `'` por `&#39;` em `esc()` **não é defesa suficiente para valores interpolados em handlers inline** (`onclick`, `ondragstart`). Entidades HTML são decodificadas pelo parser antes do JavaScript do atributo. Contenção imediata: validar `slug` estritamente no servidor (`^[a-z0-9][a-z0-9-]{0,71}$`), escapar texto para HTML e reduzir interpolação em handlers. A remoção definitiva de handlers inline fica no Lote 6.

### Lote 2 — APROVADO COM AJUSTES

Aprovado:
- resolver duplicidade de lead por e-mail antes de inserir;
- `insert` em criação manual, com `409` para duplicata;
- whitelist de campos para POST/PUT de lead e social audit;
- padronizar respostas de erro em `error`;
- corrigir UI para mostrar erro real de criação de lead.

Ajustes:
- para leads antigos, busca de e-mail deve ser case-insensitive (`ilike`) ou precedida de migração segura de normalização. `eq(email)` pode perder um registro legado com caixa diferente;
- ao enriquecer lead existente pelo webhook, não sobrescrever estágio comercial nem origem histórica sem critério. `source`, `status` e campos operacionais precisam ser preservados; dados de nova submissão continuam registrados em `ds_inbound_events`.

### Lote 3 — APROVADO NO CONCEITO, MAS O CÓDIGO PROPOSTO TEM UM BLOQUEIO CRÍTICO

Aprovado:
- caminho único de envio real;
- rate limits;
- `sent_at`;
- endpoint de opt-out em duas etapas;
- `List-Unsubscribe`;
- remover envio Resend duplicado da API principal;
- reter segredos apenas no servidor.

Correção crítica antes de executar:
- o site Datta360 atualmente envia `consents: { contact: true }`;
- a ordem de serviço valida apenas `consents.email`, `consents.marketing` ou `consents.contato`;
- se implementado assim, **todos os leads do formulário Datta360 seriam bloqueados para e-mail**.

A implementação deve reconhecer `contact === true` (ou padronizar o site e o CRM na mesma chave em uma alteração coordenada). Não publicar o guard de consentimento até existir teste E2E formulário Datta360 → lead → e-mail aprovado.

Também não transformar `source='manual'` em conclusão jurídica automática de "interesse legítimo"; isso deve ser uma regra de negócio/compliance separada da mecânica de envio.

### Lote 4 — APROVADO

Aprovado:
- headers de segurança;
- login deve validar também perfil `ds_users.role='admin'`;
- documentar bootstrap do primeiro admin;
- mover `db/*.sql` não implementados para documentação para evitar execução acidental.

Ajuste:
- HSTS é válido, mas `preload` deve ser decisão deliberada; não é necessário para fechar o risco atual. Pode começar com `max-age`/`includeSubDomains` e deixar preload para etapa posterior.
- conferir manualmente no Supabase se signup público está desabilitado.

### Lote 5 — APROVADO COM COMPLEMENTOS

Aprovado:
- paginação;
- moeda por `Intl.NumberFormat`;
- remoção de rotas mortas;
- debounce e recarga seletiva;
- acessibilidade do modal;
- guarda de nulo no drag-and-drop;
- limpeza de textos e código local/Prospector;
- identidade coerente no login.

Complemento:
- a correção de moeda precisa atingir também propostas, pedidos e financeiro (`p.currency`, `o.currency`), não apenas ocorrências literais de `R$`;
- remover `localStorage`/fallback local de verdade, não apenas esconder badge;
- não derrubar tabelas `ds_followups`/`ds_lead_events` na mesma entrega sem confirmar ausência de consumidores. Elas podem permanecer até a limpeza estrutural.

### Lote 6 — APROVADO E RECOMENDADO

A arquitetura atual copia um HTML de POC e injeta patches de string no `prebuild`. Isso é frágil e deve acabar.

Executar incrementalmente em React/Next, uma tela por PR:
1. fundação/layout/API client;
2. clientes;
3. pipeline;
4. central comercial e financeiro;
5. remoção de `poc/`, scripts de patch e `prebuild`.

Não fazer big bang. Enquanto a migração não termina, todo `replace()` crítico do patch deve falhar alto se o alvo não existir.

## Ordem de execução auditada

### Fase A — contenção imediata (executar primeiro)
1. migration estrutural somente com novas colunas/índices; sem valores comerciais `AJUSTAR`;
2. contract guard de produto DEMO;
3. seller guard sem fallback DEMO;
4. `is_demo=false` como padrão de eventos novos + remoção reset DEMO;
5. soft delete;
6. whitelist POST/PUT + validação estrita de slug;
7. XSS: escape em texto + não interpolar dados não confiáveis em JS inline quando evitável;
8. headers básicos de segurança;
9. login exige perfil admin.

### Fase B — entrada de leads
1. deduplicação por e-mail case-insensitive;
2. preservar estágio/origem ao enriquecer lead existente;
3. criação manual com insert/409;
4. testes de corrida e repetição do formulário.

### Fase C — e-mail
1. `lib/email/send.ts` único;
2. alinhar consentimento com `contact: true` do Datta360;
3. rate limits;
4. unsubscribe;
5. remover caminho Resend duplicado;
6. E2E real controlado.

### Fase D — interface/limpeza
Lote 5, sem remover estruturas de banco ainda não auditadas.

### Fase E — migração estrutural React/Next
Lote 6 por PRs pequenos.

## Bloqueios humanos reais

Antes de qualquer migration de dados comerciais, é obrigatório decidir/confirmar:
- preços/base/custos reais por produto;
- moeda por produto;
- comissão e desconto máximo;
- `seller_name`;
- `email_reply_to`;
- limites por hora/dia;
- nome comercial exibido no CRM (`DattaSeller`, `Datta360°` ou outro padrão aprovado).

Esses valores **não devem ser inventados pelo Codex**.

## Gates de aprovação

Nenhum lote vai para Production sem:
- `npm test` verde;
- `npm run build` verde;
- secret scan/diff check quando disponível;
- testes focados dos cenários alterados;
- Preview Vercel verde;
- nenhum envio real automático;
- nenhuma migration com placeholder `AJUSTAR`;
- nenhum deploy automático para Production.
