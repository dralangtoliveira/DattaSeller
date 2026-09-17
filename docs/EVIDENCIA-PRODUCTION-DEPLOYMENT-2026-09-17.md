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
