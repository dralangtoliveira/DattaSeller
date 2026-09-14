# Datta360 → DattaSeller: evidência de publicação

Última verificação: 14/09/2026, após a promoção de produção (America/New_York).

## Resultado

- O formulário público do deployment `datta360-nkunu3mr2-datta-x.vercel.app` respondeu `201` em `POST /api/leads`.
- O deployment de produção do DattaSeller `BoRSYthRP6Fv4yQCRDMFM9WZJ5M6` respondeu `201` em `POST /api/inbound/datta360`.
- A correção foi promovida para o deployment DattaSeller `HSwWcfnoW` (commit `719e8b6`, Ready) e o proxy Datta360 foi publicado no deployment `7Ak5nuZSDqWTiTHZ5iz3ZZ7AujPn` (commit `b92d882`, Ready).
- Após o E2E final, a consulta no Supabase retornou `2` eventos em `ds_inbound_events` e `2` leads em `ds_leads` com `source=datta360.com.br`, além das timelines correspondentes.
- A autenticação do webhook continua baseada em HMAC-SHA256 sobre o corpo bruto; segredos não são registrados neste documento nem nos logs operacionais.

## Correção aplicada

O runtime de produção do DattaSeller recebeu a secret key dedicada do projeto Supabase `vkvkzoulbljampcbxaim`, seguida de redeploy. O erro anterior era `401` no REST do Supabase ao inserir em `ds_inbound_events`, que aparecia externamente como `503` no DattaSeller e `502` no Datta360.

O proxy do Datta360 agora também usa `request_id`, timeout de 8 segundos e logs redigidos para distinguir erro de transporte de erro upstream.

As rotas administrativas passaram a retornar `storage_unavailable` em falhas de banco, sem repassar `error.message` do Supabase.

## Ciclo autenticado

O deployment de produção da correção de sanitização é `DBKqf81Tp` (commit `93ddfc6`, Ready). O smoke test anônimo confirmou redirecionamento de `/`, `/dashboard.html`, `/api/leads` e `/api/products` para `/login`, e credenciais inválidas retornam à tela com mensagem genérica.

No momento da validação, `auth.users=0` e `ds_users=0`; portanto não existe administrador real para validar login positivo, sessão persistente, logout ou alteração autenticada de lead.

## Limites conhecidos

- `crm.datta360.com.br` ainda depende do DNS externo: o CNAME pendente é `crm` → `d3ac14df21b458ee.vercel-dns-017.com`.
- A criação do primeiro usuário administrador e o teste autenticado do dashboard dependem de credenciais humanas; nenhum usuário ou senha foi inventado.
- `RESEND_API_KEY` permanece ausente até a chave ser fornecida pelo responsável. O código mantém o provider configurável sem expor credenciais.
