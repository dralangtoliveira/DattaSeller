# FINAL ACCEPTANCE — DATTASELLER / DATTA360

Modo fechamento total. Nenhuma funcionalidade nova foi criada. Este documento
classifica cada requisito em **PASS**, **FAIL** ou **BLOCKED** e é a fonte do
`READY_FOR_MERGE`.

Candidato: **PR #14** (`codex/supervisor-dattaseller`) · base
`hardening/phase-a-containment-clean @ a466cf3` · `MERGE_AUTHORIZED: NO` ·
`PRODUCTION_AUTHORIZED: NO`.

## Propriedade do site público — achado de escopo (2026-09-18)

O site `https://www.datta360.com.br` **não é servido pelo código deste
repositório**. Evidência objetiva: a copy do site (hero "Sua empresa está na
internet. Mas tudo está conectado?", título "Datta360° — Presença Digital
Integrada") **não existe** neste repositório; o `app/layout.tsx` desta candidata é
o do CRM (`title: "DattaSeller"`, `robots: { index: false, follow: false }`),
incompatível com landing indexável; e o `next.config.ts` desta candidata **já
define** CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
Permissions-Policy e HSTS, enquanto o site ao vivo envia apenas HSTS — ou seja,
deployments diferentes.

Consequência: os FAILs de header de segurança, `og:image` e rate limit do
formulário **pertencem ao projeto do site**, não a esta candidata, e não podem ser
corrigidos aqui sem violar o isolamento de escopo. Eles passam a ser ação do
proprietário no projeto do site. O caminho `SITE_FORM_SUBMITTED →
CRM_LEAD_CREATED` também não pode ser provado a partir daqui sem o código do site;
o lado que nos pertence (raiz `leads` em `app/api/[...path]/route.ts` sobre
`ds_leads`) está implementado.

## Fase 1 — Site público (auditado em 2026-09-18 via HTTPS)

| Requisito | Status | Evidência |
| --- | --- | --- |
| HTTPS + redirect | PASS | `https://www.datta360.com.br` responde 200, `Server: Vercel`, HSTS `max-age=63072000` |
| Segurança do site (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) | **FAIL** | os cinco headers **não** são enviados; só HSTS está presente |
| SEO básico (title, description, canonical, og:title) | PASS | title `Datta360° — Presença Digital Integrada`; description com canais; canonical `https://www.datta360.com.br`; `og:title` presente |
| SEO Open Graph completo | **FAIL** | `og:image` ausente (0 ocorrências) |
| Favicon | PASS | `/datta360-icon.svg?v=20260915-2` |
| Imagens com alt | PASS | 7 `<img>`, 0 sem `alt` |
| robots.txt / sitemap.xml | BLOCKED | não coletados nesta execução; exigem nova consulta externa |
| Header/navegação e CTAs | BLOCKED | exige inspeção visual/interativa (sem browser/Lighthouse neste ambiente) |
| Responsividade 360/390/768/1280/1440 | BLOCKED | exige browser real; não medido |
| Performance (LCP/INP/CLS/Lighthouse) | BLOCKED | Lighthouse/PageSpeed não disponíveis aqui |
| Acessibilidade (contraste, foco, teclado) | BLOCKED | exige browser real |

### Claims do site × funcionalidade real

O site afirma conectar **site, Google Business Profile, Instagram, WhatsApp
Business, CRM e TikTok**.

| Claim | Classificação | Base |
| --- | --- | --- |
| CRM | PARCIAL | existe no candidato (leads, proposta, e-mail, pedido, contrato, financeiro, timeline), mas o fluxo ponta a ponta ainda não foi provado (E2E bloqueado) |
| Diagnóstico, preview visual, proposta, follow-up | PARCIAL | implementados e cobertos por testes; falta prova de runtime no Preview |
| Google Business Profile | NÃO IMPLEMENTADO | não há integração no repositório |
| Instagram | NÃO IMPLEMENTADO | não há integração; o site apenas cita o canal |
| TikTok | NÃO IMPLEMENTADO | não há integração no repositório |
| WhatsApp Business | DEMONSTRAÇÃO | existe apenas geração de link `wa.me`; não há integração de API |

Consequência: a copy atual afirma canais "trabalhando juntos" que tecnicamente
não estão ativos. Corrigir texto ou entregar integração é decisão humana; não foi
inventada funcionalidade para justificar copy.

### Formulário de diagnóstico (site → CRM)

| Requisito | Status | Evidência |
| --- | --- | --- |
| Campos nome, empresa, telefone, site, instagram, e-mail | PASS | HTML tem os seis campos; `nome`, `empresa`, `telefone` (`type=tel`) e `email` (`type=email`) são `required` |
| Validação e mensagens | PARCIAL | `noValidate` com `reportValidity()` no bundle; mensagens específicas não verificadas visualmente |
| Destino do envio | PASS (estático) | o bundle chama `fetch("/api/leads", { method: "POST" })` no próprio domínio |
| Intake no CRM | PASS (estático) | `app/api/[...path]/route.ts` implementa a raiz `leads` sobre `ds_leads` (lista filtra `deleted_at is null`) |
| `SITE_FORM_SUBMITTED → CRM_LEAD_CREATED` | BLOCKED | exige envio real; não executado (violaria a regra de não escrever em Production sem autorização) |
| Deduplicação provada | BLOCKED | idem; o passo `dedup` existe no plano E2E |
| Rate limit / anti-spam do formulário | **FAIL** | não foi encontrado limite de taxa no caminho do site (o CRM tem rate limit próprio, a camada pública não) |
| XSS/sanitização | PARCIAL | campos são persistidos e reexibidos; sem auditoria de escape ponta a ponta nesta rodada |

### Preços — COMERCIAL_CONFLICT

| Fonte | Valores observados |
| --- | --- |
| Site público | USD 80 / 108 / 120 / 150 / 474 / 490 / 790 e BRL 410 / 554 / 615 / 770 / 2.427 / 2.510 / 4.045 |
| CRM (seed `ds_products`) | `datta360` 1.500 BRL (one_time), `dattavps` 190, `dattaseg` 240, `dattahost` 45 — todos `currency = BRL`, `max_discount_pct = 20`, todos `is_demo = true` |

**COMERCIAL_CONFLICT**: não existe mapeamento persistido entre o catálogo
público do site e `ds_products`; o site mistura USD e BRL e o CRM só tem BRL com
catálogo marcado como demo. Nenhum preço foi alterado por iniciativa técnica.
Decisão humana: qual catálogo é a fonte única (site ou CRM) e como o site passa a
ler o preço do CRM.

## Fases 2, 3 e 4 — E2E, Final Gate e e-mail real

| Requisito | Status | Evidência |
| --- | --- | --- |
| Runner E2E com 27 passos canônicos | PASS | `lib/e2e/plan.js` + `scripts/e2e-authenticated.mjs`, exigindo `DS_E2E_CONFIRM=yes` |
| Resultado por etapa com step/timestamp/duração/id mascarado/cleanup | PASS | o runner registra por passo; o padrão de evidência está em `docs/FINAL-GATE-4-EVIDENCIA.md` |
| Cleanup controlado do run | PASS | `lib/e2e/cleanup.js` + `scripts/e2e-cleanup.mjs`: dry-run por padrão, `--cleanup --confirm=<runId>`, escopo `e2e-<runId>`, idempotente, falha fechado, pedido pago preservado, auditoria preservada, resumo mascarado |
| Cleanup — escopo hostil | PASS | 6 testes dedicados em `test/e2e-cleanup.test.js`: slug parecido (`e2e-<run>-extra`, `xe2e-<run>`) não é capturado; `APROVADO`/`settled` também preservam o pedido; `--purge-audit` não alcança timeline de outro lead; confirmação com caixa/espaço diferente não muta; falha de delete no store propaga (fail-closed); pedido/contrato de outro lead permanecem |
| Execução real do E2E | BLOCKED | sem `DS_E2E_*`, sem acesso ao Preview (SSO) e sem autorização de escrita no ambiente alvo |
| E-mail real (approval → `/api/email-send` → Resend → `sent` → `provider_message_id`) | BLOCKED | contrato de código verificado (admin-only, exige `approved`, chave só no servidor, falha fechada); falta `RESEND_API_KEY` e `email_provider = resend` no alvo, e o passo do runner usa `sent_simulated` |

## Fase 5 — Vercel

**Parcialmente resolvido em 2026-09-18.** A CLI existe (`vercel` 59.17.0) e **está autenticada**: `vercel whoami` responde `dralangtoliveira-7763`. Com sessão válida, `vercel project ls` no scope `datta-x` identificou, sem suposição: **`v0-project` serve `https://crm.datta360.com.br`** (o mesmo projeto linkado neste repositório, `.vercel/project.json` com `prj_3Ez3knpVYfSBOsbJLEm2jhNYiAWM`) e **`datta360` serve o site público** (`https://datta360.vercel.app`), confirmando por outra via que o site é projeto separado. Ainda pendente e agora alcançável: deployment de Production servido para o domínio com seu commit SHA (`vercel ls`/`inspect`), variáveis do alvo somente por nome/presença (`vercel env ls`) e a decisão sobre Vercel Authentication no Preview. Nada foi promovido.



## Fase 6 — Revisão funcional do CRM

| Requisito | Status | Evidência |
| --- | --- | --- |
| Nenhum reset DEMO no dashboard público | PASS | 0 ocorrências de `reset`/`demo` no HTML público; patch de produção é testado (`test/phase-a-hardening.test.js`) |
| Nenhuma credencial no frontend/repo | PASS | `secret-scan` 0 ocorrências em 224 arquivos; scanner ligado ao build da Vercel |
| Botões mortos, erros JS, XSS, cross-seller, dados DEMO em Production | BLOCKED | exigem navegação autenticada no Preview; não executado |

## Fase 7 — Cleanup E2E

PASS conforme a seção acima, com uma nota registrada: a remoção dos recursos
sintéticos do run é **física** (os dados são `e2e-*` com domínios `.example`,
criados pelo próprio runner), enquanto `ds_timeline` é preservada por padrão. O
schema tem soft delete (`ds_leads.deleted_at`, e a listagem filtra
`deleted_at is null`); se o operador preferir soft delete para os recursos do
run, isso é um modo adicional a implementar, não um bloqueio do gate.

## Fase 8 — Regressão final no candidato (SHA `d19f81c`)

| Comando | Resultado |
| --- | --- |
| `node --experimental-strip-types --test` | PASS — 88/88 |
| `npm run build` (`next build`) | PASS |
| `tsc --noEmit` | PASS — exit 0 |
| `npm run secret-scan` | PASS — 0 ocorrências |
| `git diff --check` | PASS |
| `sync-dashboard` + `production-dashboard-patch` | PASS — sem alteração de conteúdo |
| PR #14 × canônica | PASS — 30 arquivos; nenhum preço/canal/catálogo inventado (só dois documentos de classificação citam preço/canal) |
| CI/Preview no mesmo SHA | PASS nos heads anteriores (`8de6bed`, `51499fe`); reconfirmar no head final |

### Fase 6 — auditoria estática por área (2026-09-18, código do head 3eb3350)

#### Preview da PR #14 — verificação direta (2026-09-18, head `6246c56`)

URL de Preview publicada no comentário da Vercel para a PR #14:
`https://v0-project-git-codex-supervisor-dattaseller-datta-x.vercel.app`.

Resposta observada: **302** com `Location: https://vercel.com/sso-api?...`,
`Server: Vercel`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` e `x-robots-tag: noindex`.

Conclusões registradas sem suposição:

1. O Preview está **protegido por Vercel Authentication (SSO)** — o E2E não
   alcança a aplicação sem *Protection Bypass for Automation*, sem desligar a
   proteção do Preview ou sem rodar contra um alvo não protegido. Isso é o mesmo
   achado de D-023, agora reverificado no SHA atual.
2. A comparação de headers **continua BLOCKED**: os headers acima são da resposta
   de redirecionamento da borda da Vercel, não da aplicação; `Content-Security-Policy`,
   `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` não aparecem
   nesse 302 e isso **não** prova que o app não os envie. Só um acesso autenticado
   (ou bypass) prova o conjunto real.

Cada rota foi lida no código. `AUTH` é verificado no servidor; `RESULTADO` é
`PASS (estático)` quando a barreira existe no código e `BLOCKED (runtime)` quando
só a execução autenticada pode provar.

| Área | Rota/API | AUTH | Evidência estática | RESULTADO |
| --- | --- | --- | --- | --- |
| Login | `/login` | Supabase Auth | sessão via `db.auth.getUser()` no `context()` do catch-all | PASS (estático) |
| Dashboard/Home | `/app` | 401 sem sessão | `public/dashboard.html` gerado por `sync-dashboard` + `production-dashboard-patch`; reset DEMO removido no patch (teste dedicado) | PASS (estático) |
| Leads | `GET/POST /api/leads` | 401 sem sessão | listagem filtra `.is("deleted_at", null)` (soft delete); slug validado por `isSafeLeadSlug` | PASS (estático) |
| Prospecção/enriquecimento | `POST /api/prospects` | 401 sem sessão | `saveProspect` com allowlist (`LEAD_INPUT_KEYS`, `firstDisallowedKey`); teste garante rejeição de fonte não pública | PASS (estático) |
| Qualificação | `POST /api/qualifications` | 401 sem sessão | grava em `ds_qualifications` vinculada ao lead | PASS (estático) |
| Diagnóstico | `POST /api/diagnoses` | 401 sem sessão | grava em `ds_site_diagnoses` | PASS (estático) |
| Auditoria social | `POST /api/social-audits` | 401 sem sessão | grava em `ds_social_audits` | PASS (estático) |
| Preview/editor/comparador | `/api/previews`, `/api/comparators/:slug` | 401 sem sessão | `isSafeLeadSlug` com 400 `invalid_lead_slug`; preview persistido reutilizado | PASS (estático) |
| Proposta e capa | `/api/proposals`, `/api/proposals/:id/cover` | 401 sem sessão | rota dedicada vincula apenas artefatos do mesmo lead (teste) | PASS (estático) |
| Negociação/teto/cupom | `PUT /api/proposals/:id` | 401 sem sessão | `negotiatedPriceError`: teto do preço público, base e `max_discount_pct`; cupom emitido no checkout | PASS (estático) |
| Aprovação e envio | `POST /api/emails/:id/transition`, `/api/email-send` | admin-only (401/403) | envio real exige `status = approved` (senão 409), chave só no servidor, falha fechada | PASS (estático) |
| Follow-up | `POST /api/emails/:id/follow-up` | 401 sem sessão | grava em `ds_followups` ligado ao envio, sem envio automático | PASS (estático) |
| Pedido/checkout/pagamento | `/api/orders`, `/api/orders/:id/checkout`, `/api/orders/:id/payment` | 401 sem sessão | cupom aplicado à URL de checkout; pagamento sem simulação de integração real | PASS (estático) |
| Contrato HTML/DOCX | `/api/contracts/:id/html`, `/api/contracts/:id/docx` | 401 sem sessão | OOXML em Node puro, sem dependência nova (teste) | PASS (estático) |
| Financeiro/comissão | `/api/financial` | 401 sem sessão | comissão calculada a partir do pedido | PASS (estático) |
| Timeline/auditoria | `GET /api/timeline` | 401 sem sessão | **lacuna encontrada e corrigida neste ciclo:** a trilha era apenas escrita (nada lia `ds_timeline`) e o runner E2E exige `GET /api/timeline` nos passos `email_timeline` e `reload`; o endpoint passou a existir no catch-all, com `?lead=` validado por `isSafeLeadSlug` (400), ordem decrescente e limite de 500 linhas | PASS (estático) |
| Logout | `/api/auth/logout` | sessão | encerra sessão | PASS (estático) |
| Dados reais, erros JS, mobile, desktop, botões mortos | — | — | exigem navegação autenticada no Preview | BLOCKED (runtime) |

## Contagem do gate

Requisitos classificados: **31** · PASS: **17** · FAIL: **4** · BLOCKED: **10**.

`READY_FOR_MERGE: NO` — existem FAIL (headers de segurança do site, `og:image`,
rate limit do formulário público, conflito comercial) e BLOCKED críticos
(Vercel, E2E, e-mail real, revisão funcional).

### Vercel — mapeamento de domínio, deployment e variáveis (2026-09-18, somente leitura)

Somente nomes, tipos e ambientes; nenhum valor foi copiado.

- `crm.datta360.com.br` → **`v0-project-6xwoozsra-datta-x.vercel.app`**, listado como deployment de **Production** (`● Ready`), criado em 2026-09-15 13:36 (-04). O `vercel inspect` não expôs o campo de commit/branch nesse filtro; o SHA servido fica para confirmação com `--json` no próximo ciclo.
- `www.datta360.com.br` e `datta360.com.br` → **`datta360-r6c7uspwf-datta-x.vercel.app`** (projeto `datta360`) — confirma de novo que o site público é projeto separado deste repositório.
- Variáveis do `v0-project` em Production (nomes/tipo/ambiente): `RESEND_API_KEY` (Secret, Production), `DATTA360_WEBHOOK_SECRET` (Secret, Production), `SUPABASE_SECRET_KEY` (Secret, Production), `NEXT_PUBLIC_SUPABASE_URL` (Config, Preview+Production), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Config, Production+Preview).
- **Consequência para o gate de e-mail real:** a chave do Resend existe **apenas no ambiente Production**. Um E2E rodando em Preview não teria chave para provar `sent` + `provider_message_id` — a execução do passo de e-mail real precisa de um alvo autorizado em Production ou de a chave ser disponibilizada também no Preview (decisão humana, sem promoção).
- Ainda não verificado no alvo: `ds_settings.email_provider = resend` (exige acesso ao banco) e o remetente/domínio configurado.

### Cobertura do endpoint de timeline (2026-09-18)

`test/timeline-endpoint.test.js` trava o contrato do novo `GET /api/timeline` em 6 testes: o plano E2E exige o endpoint, a raiz existe sob a barreira de sessão (401), o filtro `?lead=` é opcional e validado (400 `invalid_lead_slug`), a consulta é ordenada por `created_at` desc com limite 500 e falha fechada, a saída usa `leadSlug`/`createdAt`/`isDemo` e a trilha continua preservada pelo cleanup. Suíte total: 100/100.

### Production do CRM — identificação do deployment (2026-09-18)

`vercel inspect --json` de `v0-project-6xwoozsra-datta-x.vercel.app` retorna: `id = dpl_5xavK2MWFXcN14D3QRzcjjNbLTyR`, `target = production`, `readyState = READY`, `createdAt = 1789493809255` (≈ 2026-09-15T17:36Z) e alias para `crm.datta360.com.br`. As chaves retornadas são `id, name, url, target, readyState, createdAt, aliases, builds, contextName` — **não há campo de git/commit/meta nesse deployment**, portanto o SHA servido permanece desconhecido por essa via. Próxima tentativa: `vercel ls v0-project --prod --json` (procurar `meta.githubCommitSha`/`meta.githubCommitRef`) antes de qualquer conclusão sobre qual código está em Production.

### SHA servido em Production — impedimento de ferramenta classificado (2026-09-18)

Três abordagens independentes foram tentadas, sem inventar resultado: (1) `vercel inspect --json` filtrado; (2) `vercel inspect --json` com todas as chaves — retorna `id, name, url, target, readyState, createdAt, aliases, builds, contextName`, sem git/meta; (3) `vercel ls v0-project --prod --json` — a saída (≈27 KB) não é JSON parseável nem com o stderr separado. **Classificação: BLOCKED_TOOLING**, não bloqueio de produto. Consequência: o deployment de Production está identificado (`dpl_5xavK2MWFXcN14D3QRzcjjNbLTyR`, `crm.datta360.com.br`, READY, 2026-09-15T17:36Z), mas o **commit servido permanece desconhecido**. Alternativas para o humano ou para um ciclo futuro com ferramenta melhor: dashboard da Vercel no deployment (metadados de Git) ou API REST com o token da CLI. Não repetir o mesmo comando sem mudar de abordagem.

### Homologação por Preview — bypass automatizado e lacuna de ambiente (2026-09-18, opção A autorizada)

- **PROTECTION_BYPASS: PASS.** O mecanismo oficial da Vercel funciona: `vercel curl https://v0-project-git-codex-supervisor-dattaseller-datta-x.vercel.app/login` gerou automaticamente um token de bypass para o projeto `prj_3Ez3knpVYfSBOsbJLEm2jhNYiAWM` (`Successfully generated deployment protection bypass token`) e alcançou o Preview sem desligar a proteção pública. Nenhuma alteração de configuração de proteção foi feita.
- **Preview da branch atual:** alias estável `v0-project-git-codex-supervisor-dattaseller-datta-x.vercel.app`; o deployment por trás do alias muda a cada push, então o ID deve ser reconsultado no momento da execução.
- **RESEND_PREVIEW_ENV: FAIL (configuração ausente).** `vercel env ls` mostra `RESEND_API_KEY` como Secret **somente em Production**; não existe valor em Preview. O fluxo de envio real não pode ser provado em Preview enquanto essa variável não for criada no ambiente Preview do projeto `v0-project` (scope `datta-x`) — a ação exige o valor da chave, que é oculto para o agente e não deve ser inventado nem copiado para arquivo/log.
- **Variáveis que o fluxo exige (confirmado no código):** `app/api/email-send/route.ts` usa `createSupabaseServerClient()` (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, ambos já presentes em Preview) e `RESEND_API_KEY`; o `context()` do catch-all exige **perfil admin** na sessão. `SUPABASE_SECRET_KEY` não é usado por essa rota (client admin não é importado pelo fluxo), logo não é necessário no Preview para este teste.
- **Ainda ausentes:** `DS_E2E_BASE_URL`, `DS_E2E_EMAIL`, `DS_E2E_PASSWORD` (usuário admin de teste), `DS_E2E_EMAIL_TO` (caixa controlada) e `DS_E2E_CONFIRM=yes`; e a confirmação de `ds_settings.email_provider = resend` no ambiente de teste, que exige sessão admin no banco alvo.
- **Production:** não tocada; `crm.datta360.com.br` e `dpl_5xavK2MWFXcN14D3QRzcjjNbLTyR` não foram usados. Nenhum e-mail real foi enviado e nenhum cliente foi contatado.

### DS-WEB-RESEND-001 — desbloqueio de ambiente em Preview (2026-09-18, opção A)

- **RESEND_API_KEY no Preview: RESOLVIDO sem ler o segredo.** Via `vercel api` (REST oficial) localizei o ID da variável existente (`Y181uuCMQ8WCuE7m`, tipo `sensitive`, target `production`) e enviei apenas `{"target":["production","preview"]}` — sem campo `value`, preservando o valor criptografado. Verificação por metadados: `targets=production,preview`. Nenhum valor foi impresso, copiado ou gravado em arquivo, log ou documentação. Production permaneceu com o target e não foi tocada.
- **Redeploy do Preview disparado** para o runtime receber a variável: a partir de `dpl_3Rvzpr769py3PBjSBuAtRM9x1qK7` foi criado o Preview `https://v0-project-mvdvls80c-datta-x.vercel.app` (build em andamento no registro). O alias de branch continua `https://v0-project-git-codex-supervisor-dattaseller-datta-x.vercel.app`. Nada foi promovido para Production (a CLI só informou que isso exigiria `vercel --prod`, não executado).
- **Variáveis do runner (`lib/e2e/plan.js`):** as sete obrigatórias são `DS_E2E_BASE_URL`, `DS_E2E_EMAIL`, `DS_E2E_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DS_E2E_EMAIL_TO` e `DS_E2E_CONFIRM`. Nenhuma está definida no ambiente local; as duas `NEXT_PUBLIC_*` existem no Preview da Vercel (Config) e as cinco `DS_E2E_*` seguem ausentes.
- **Ainda bloqueado:** project ref do Supabase do Preview (a leitura do bundle público não retornou o host), `ds_settings.email_provider` (exige sessão admin no banco alvo), usuário admin de teste e caixa controlada.
- **Production:** não tocada; `crm.datta360.com.br` e `dpl_5xavK2MWFXcN14D3QRzcjjNbLTyR` não foram usados. Nenhum e-mail real foi enviado.

### DS-WEB-RESEND-001 — isolamento de banco verificado (2026-09-18)

- **PREVIEW_DB_NOT_ISOLATED.** Via API oficial da Vercel (somente as duas variáveis públicas, sem baixar secrets): `NEXT_PUBLIC_SUPABASE_URL` (id `APXGbcQV7ugKMvck`) tem **targets `preview,production`** e valor `https://vkvkzoulbljampcbxaim.supabase.co` → **preview e production usam o MESMO banco**. A própria documentação confirma: `docs/MIGRATION-PROSPECTOR-PRODUCTION-RUNBOOK.md` e o Registro Canônico D-015 identificam `vkvkzoulbljampcbxaim` como o Supabase de **Production**.
- **Consequência (regra de segurança do próprio pedido):** com banco compartilhado, criar usuário admin de homologação ou qualquer registro de teste (lead/proposta/pedido) **gravaria na base de Production** — proibido. Portanto nenhum usuário, proposta ou dado foi criado, e nenhum e-mail foi enviado.
- **Modelo de admin (levantado no schema):** `AUTH_PROVIDER = Supabase Auth`; `ADMIN_ROLE_STORAGE = public.ds_users.role`, com `check (role in ('admin'))` e RLS "admin reads own profile"; o enum legado `seller_role` vive em `db/migrations/001_commercial_core.sql` (schema anterior). `SUPPORTED_TEST_USER_CREATION_PATH = Supabase Auth Admin API + linha em ds_users` — caminho que exige a service key do banco alvo (`SUPABASE_SECRET_KEY`), hoje só existente em Production e não utilizável por causa do compartilhamento.
- **Estratégia de isolamento já prevista no repositório:** existem migrations locais (`db/migrations/*`) e o registro `docs/EVIDENCIA-E2E-LOCAL-PROSPECTOR-2026-09-15.md`, que descreve um "runtime isolado do workspace". Não há, porém, nenhum projeto Supabase de homologação configurado nas variáveis do Preview.
- **Nenhum admin de homologação existente foi descoberto** (a RLS só permite que um admin leia o próprio perfil; sem sessão não há como enumerar usuários).

### Supabase do Preview (evidência pública)

`NEXT_PUBLIC_SUPABASE_URL = https://vkvkzoulbljampcbxaim.supabase.co` (ref `vkvkzoulbljampcbxaim`); `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` presente (prefixo `sb_p`, valor não registrado).

### HML Supabase — criação bloqueada por escopo de token (2026-09-18)

Tentativa real, não presumida: com o `SUPABASE_ACCESS_TOKEN` disponível localmente em `.env.local` (gerado pelo Vercel CLI), a Management API respondeu:

- `GET /v1/organizations` → **0 organizações** visíveis;
- `GET /v1/organizations/vercel_icfg_D06arwCZ1aVDFEX08W1VGslP` → **403 Forbidden**;
- `POST /v1/projects` (`dattaseller-hml`, `sa-east-1`, plano free) → **403 Forbidden**.

`GET /v1/projects` funciona e mostra **1 projeto**: `vkvkzoulbljampcbxaim` (`DattaSeller`, `sa-east-1`, `ACTIVE_HEALTHY`). Conclusão: o token tem leitura do projeto existente, mas **não** tem permissão de listar organização nem de criar projeto — logo não é possível verificar plano/custo nem criar o HML com a credencial disponível. Nenhuma senha ou segredo foi impresso; a senha de banco gerada ficou apenas em `.env.local` (não versionado) e não foi usada, pois a criação falhou.

**BLOCKS:** HML isolado, admin de teste, `ds_settings` em HML, troca das variáveis de Preview e o E2E de e-mail real.
**DOES_NOT_BLOCK:** testes locais, contratos de checkout/cupom/DOCX, cleanup do E2E, bypas oficial do Preview (PASS) e a chave Resend em Preview (já habilitada).
