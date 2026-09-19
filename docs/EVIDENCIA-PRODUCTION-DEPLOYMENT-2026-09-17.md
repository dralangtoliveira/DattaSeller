# Evidência — qual deployment serve `crm.datta360.com.br`

Data: 2026-09-17. Objetivo: identificar o deployment, a branch e o commit
efetivamente associados ao domínio de Production, sem presumir.

## Referências registradas do alvo

- Vercel team: `team_4LMpNJbFqbxdJk09FLoNpimg`
- Vercel project: `prj_3Ez3knpVYfSBOsbJLEm2jhNYiAWM` (nome exibido: `v0-project`)
- Scope: `datta-x`
- Linha canônica esperada: `hardening/phase-a-containment-clean` em `a466cf3`

## O que foi comprovado

**O domínio está vivo e é servido pela Vercel, com o comportamento do
DattaSeller.**

```
GET https://crm.datta360.com.br
HTTP/1.1 307 Temporary Redirect
Location: /login
Server: Vercel
X-Vercel-Id: iad1::pfmpk-1789662861830-916aef4ca9cf
Date: Thu, 17 Sep 2026 16:34:22 GMT
Strict-Transport-Security / X-Frame-Options / Permissions-Policy presentes

GET https://crm.datta360.com.br/login -> 200
```

O redirecionamento para `/login` é a guarda de sessão do próprio DattaSeller
(`proxy.ts`), o que descarta a hipótese de o domínio servir apenas o starter
estático do v0.

**DNS:** `crm.datta360.com.br` é CNAME para `d3ac14df21b458ee.vercel-dns-017.com`
com A em `216.198.79.65` e `64.29.17.65` — infraestrutura de domínio gerenciado
da Vercel. O prefixo `d3ac14df21b458ee` é o token de domínio da Vercel e **não**
identifica o projeto ou o deployment.

**Deployments registrados no GitHub para este repositório: nenhum é
Production.** Os 15 deployments mais recentes têm `environment = Preview`. O
mais recente é o do próprio HEAD canônico:

```
deployment 6507221782  env=Preview  ref=a466cf39  created=2026-09-17T16:20:30Z
status: success  environment_url=https://v0-project-9nzpbvxww-datta-x.vercel.app
```

Ou seja: a integração GitHub→Vercel entrega **Preview**, e o domínio de
Production não expõe o commit que está servindo.

## Bloqueio comprovado

A CLI da Vercel existe nesta máquina com credencial armazenada
(`%APPDATA%\com.vercel.cli\Data\auth.json`, `currentTeam =
team_4LMpNJbFqbxdJk09FLoNpimg`), mas o token está **inválido**:

```
GET https://api.vercel.com/v2/user
{ "error": { "code": "forbidden", "message": "Not authorized", "invalidToken": true } }
```

O mesmo erro ocorreu em `/v9/projects/<project>`,
`/v9/projects/<project>/domains` e `/v6/deployments`. É exatamente o
"sem autorização para esse scope" já registrado para a Vercel.

Sem credencial válida não é possível ler aliases, o domínio do projeto, o
`meta.githubCommitRef` do deployment de Production nem o `target`. **Não
presumo o mapeamento.**

## O que falta para fechar este item (intervenção humana de credencial)

1. `vercel login` na CLI (ou fornecer um token com acesso ao scope `datta-x`);
2. então rodar, com o token válido:
   - `GET /v9/projects/prj_3Ez3knpVYfSBOsbJLEm2jhNYiAWM/domains?teamId=team_4LMpNJbFqbxdJk09FLoNpimg`
     — confirma se `crm.datta360.com.br` pertence a este projeto e qual
     `gitBranch` está associada;
   - `GET /v6/deployments?projectId=...&target=production` — deployment ID, URL,
     `meta.githubCommitRef` e `meta.githubCommitSha`;
   - `GET /v4/aliases?teamId=...` — qual deployment o alias aponta.
3. Registrar aqui o deployment ID, URL, branch e commit resultantes.

Enquanto isso, o E2E autenticado (Final Gate n. 4) não pode declarar
Production: o commit servido pelo domínio é **desconhecido**.

## Passos exatos para o desbloqueio (sem executar nada que exija credencial)

### A. Autenticar a Vercel no scope `datta-x`

```powershell
pnpm dlx vercel@latest login        # ou: npx vercel login
pnpm dlx vercel@latest whoami       # confirmar usuário e scope ativo
```

O `config.json` da CLI já aponta `currentTeam = team_4LMpNJbFqbxdJk09FLoNpimg`.
Se o login entrar em outro time, use `--scope datta-x` em cada comando.

Alternativa sem CLI: criar um token com acesso ao scope `datta-x` e exportar
apenas em memória (`$env:VERCEL_TOKEN`). **Não** gravar o valor em arquivo do
repositório.

### B. Identificar inequivocamente projeto, deployment, alias e commit

Com a CLI autenticada, dentro do repositório (`.vercel/` **não** está no
`.gitignore` deste repositório — confira `git status` antes de qualquer commit):

```powershell
pnpm dlx vercel@latest link --yes --project v0-project --scope datta-x
pnpm dlx vercel@latest alias ls --scope datta-x | Select-String crm.datta360
pnpm dlx vercel@latest inspect crm.datta360.com.br --scope datta-x
pnpm dlx vercel@latest ls --prod --scope datta-x
```

Ou pela API, com token válido:

```powershell
$h = @{ Authorization = "Bearer $env:VERCEL_TOKEN" }
$team = 'team_4LMpNJbFqbxdJk09FLoNpimg'
$prj  = 'prj_3Ez3knpVYfSBOsbJLEm2jhNYiAWM'
Invoke-RestMethod "https://api.vercel.com/v9/projects/$prj/domains?teamId=$team" -Headers $h
Invoke-RestMethod "https://api.vercel.com/v6/deployments?projectId=$prj&teamId=$team&target=production&limit=5" -Headers $h
Invoke-RestMethod "https://api.vercel.com/v4/aliases?teamId=$team" -Headers $h | Select-Object -ExpandProperty aliases | Where-Object alias -eq 'crm.datta360.com.br'
```

Registrar aqui: **project ID**, **deployment ID**, **URL do deployment**,
**alias**, **branch** (`meta.githubCommitRef`) e **commit**
(`meta.githubCommitSha`) que servem Production.

### C. Executar o E2E autenticado contra esse deployment

```powershell
$env:DS_E2E_CONFIRM='yes'
$env:DS_E2E_BASE_URL='https://crm.datta360.com.br'   # ou a URL do deployment identificado
$env:DS_E2E_EMAIL='<admin com ds_users.role = admin>'
$env:DS_E2E_PASSWORD='<senha do admin>'
$env:NEXT_PUBLIC_SUPABASE_URL='<url do projeto Supabase>'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='<publishable key>'
$env:DS_E2E_EMAIL_TO='<caixa controlada que recebe o e-mail do teste>'
npm run e2e:authenticated
```

Rode primeiro contra o deployment identificado; só depois de aprovado trate o
domínio como Production. Nenhuma promoção para Production é feita por este
passo.

### D. Variáveis e credenciais necessárias (nomes apenas — valores nunca aqui)

| Nome | Onde vive | Para que serve |
| --- | --- | --- |
| `VERCEL_TOKEN` | ambiente local da execução | consultar projeto, domínios, aliases e deployments |
| `DS_E2E_CONFIRM` | ambiente do E2E | confirmação explícita; sem `yes` o script não executa |
| `DS_E2E_BASE_URL` | ambiente do E2E | endereço do ambiente testado |
| `DS_E2E_EMAIL` / `DS_E2E_PASSWORD` | ambiente do E2E | login do admin no Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ambiente do E2E | montar a sessão exatamente como o CRM monta |
| `DS_E2E_EMAIL_TO` | ambiente do E2E | caixa controlada que recebe o e-mail do teste |
| `RESEND_API_KEY` | servidor do ambiente testado | envio real; sem ela o passo de envio aparece como `BLOCKED` |
| `email_provider` | `ds_settings` do ambiente testado | precisa ser `resend` para o envio sair do modo mock |
