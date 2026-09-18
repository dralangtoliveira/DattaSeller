# Supabase de homologação (HML) — bootstrap

Objetivo: dar ao DattaSeller um banco **isolado** de homologação para o E2E, sem
tocar Production (`vkvkzoulbljampcbxaim`). Hoje Preview e Production apontam para
o mesmo projeto Supabase, e o `SUPABASE_ACCESS_TOKEN` disponível localmente
**não tem permissão de criar projeto** (403 em `POST /v1/projects`), então o HML
ainda não existe.

## Comandos

```bash
node scripts/hml-bootstrap.mjs check   # leitura: token, organizações visíveis, projetos, se o HML já existe
node scripts/hml-bootstrap.mjs plan    # plano ordenado, sem executar
HML_APPLY=yes HML_ORG_ID=<org> node scripts/hml-bootstrap.mjs apply   # executa o plano
```

## Plano que o script executa (nesta ordem)

1. criar `dattaseller-hml` em `sa-east-1` **somente** com custo adicional zero;
2. aplicar as migrations canônicas na ordem: `db/migrations/001_commercial_core.sql`,
   `002_lead_identity.sql`, `003_recommendation_feedback.sql`,
   `supabase/migrations/20260914031102_dattaseller_web_schema.sql`;
3. validar RLS/policies e a presença de `ds_users`, `ds_settings`, `ds_leads`,
   `ds_proposals`, `ds_orders`;
4. `ds_settings.email_provider = 'resend'` e remetente de homologação;
5. criar o admin E2E pela **Auth Admin API** + linha em `ds_users.role='admin'`
   (senha aleatória gerada localmente, gravada só no `.env.local`, nunca impressa);
6. apontar **somente** o target `preview` da Vercel para
   `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` do HML;
7. redeploy do Preview e prova de login pela aplicação;
8. E2E com `DS_E2E_BASE_URL` do Preview, `DS_E2E_EMAIL`/`DS_E2E_PASSWORD` do admin
   HML, `DS_E2E_EMAIL_TO` da caixa controlada e `DS_E2E_CONFIRM=yes`.

## Salvaguardas

- nunca imprime, commita ou documenta segredo (token, senha de banco, service key);
- nunca altera Production: o ref de Production é citado apenas como aviso;
- `apply` exige `HML_APPLY=yes`;
- recusa explícita quando o custo não pode ser comprovado como zero;
- qualquer custo > US$ 0 vira `HUMAN_APPROVAL_REQUIRED_FOR_PAID_SUPABASE`.

## Bloqueio atual

`HUMAN_ACTION`: fornecer um `SUPABASE_ACCESS_TOKEN` com permissão de **criar
projeto**, ou criar `dattaseller-hml` (`sa-east-1`) manualmente. Com o token
adequado, `apply` faz os passos 1–4 e o restante segue automaticamente.

## HML existente (2026-09-18, informado pelo responsavel)

Projeto **dattaseller-hml** — ref `qfwvkarvueuezeqfljbl`, regiao `sa-east-1`, status `ACTIVE_HEALTHY`. Estado confirmado: tabelas `ds_*` presentes, `ds_settings` presente, `demo_mode = true`, `email_provider = mock`, remetente `demo@local.invalid`.

Reconhecimento feito por mim agora: o `SUPABASE_ACCESS_TOKEN` disponivel continua **scoped ao projeto de Production** — `GET /v1/projects` lista apenas `vkvkzoulbljampcbxaim` e `GET /v1/projects/qfwvkarvueuezeqfljbl` responde **403**, assim como `api-keys` e `database/query`. Ou seja: o HML existe, mas a credencial atual nao o administra. Nada foi criado, alterado ou migrado; emails reais permanecem bloqueados ate o Preview apontar exclusivamente para o HML.
