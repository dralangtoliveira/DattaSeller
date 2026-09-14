# Datta360 → DattaSeller: evidência de publicação

Última verificação: 14/09/2026, aproximadamente 10:09 (America/New_York).

## Resultado

- O formulário público do deployment `datta360-nkunu3mr2-datta-x.vercel.app` respondeu `201` em `POST /api/leads`.
- O deployment de produção do DattaSeller `BoRSYthRP6Fv4yQCRDMFM9WZJ5M6` respondeu `201` em `POST /api/inbound/datta360`.
- O lead sintético foi persistido em `public.ds_leads` com `source=datta360.com.br`, além do evento de entrada e da timeline.
- A autenticação do webhook continua baseada em HMAC-SHA256 sobre o corpo bruto; segredos não são registrados neste documento nem nos logs operacionais.

## Correção aplicada

O runtime de produção do DattaSeller recebeu a secret key dedicada do projeto Supabase `vkvkzoulbljampcbxaim`, seguida de redeploy. O erro anterior era `401` no REST do Supabase ao inserir em `ds_inbound_events`, que aparecia externamente como `503` no DattaSeller e `502` no Datta360.

O proxy do Datta360 agora também usa `request_id`, timeout de 8 segundos e logs redigidos para distinguir erro de transporte de erro upstream.

## Limites conhecidos

- `crm.datta360.com.br` ainda depende do DNS externo: o CNAME pendente é `crm` → `d3ac14df21b458ee.vercel-dns-017.com`.
- A criação do primeiro usuário administrador e o teste autenticado do dashboard dependem de credenciais humanas; nenhum usuário ou senha foi inventado.
- `RESEND_API_KEY` permanece ausente até a chave ser fornecida pelo responsável. O código mantém o provider configurável sem expor credenciais.
