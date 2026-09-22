# HML final closing — proposta pública, e-mail e follow-up

Este roteiro é somente para HML isolado. Não execute em Production, não aplique migration e não registre tokens, cookies ou URLs-capability completas em ticket, commit ou log.

## Pré-condições

1. Confirmar `HML_APPLY=yes`, ref HML declarado e host que não seja Production com o guard do repositório.
2. Entrar como administrador do CRM e usar um lead de E2E exclusivo.
3. Criar diagnóstico, preview/redesign e auditoria social para o mesmo `lead_slug`.
4. Criar proposta com `commercial_sku` aprovado do `catalog/products.json`, `product_id` técnico ativo e, se o preço divergir do catálogo, `commercial_override_confirmed: true`.

## Ordem de execução

1. Publicar a proposta pelo endpoint administrativo `POST /api/proposals/{proposal_id}/public` e guardar a URL retornada somente no cofre operacional da sessão.
2. Abrir `GET /p/{token}` sem sessão. Confirmar cabeçalhos `noindex`, `DENY`, CSP sem frame externo, diagnóstico, antes/depois, preview, social e snapshot Datta360° em BRL.
3. Criar o rascunho DS-VALUE-08 via `POST /api/emails/prospector` com `proposal_id` e `public_proposal_url` retornada no passo 1. Confirmar `201`, `status=draft`, um único link `/p/{token}`, 120–180 palavras e ausência de preço/cupom/promoção.
4. Não enviar e-mail real. Se for necessário testar a transição, usar apenas o fixture/simulador HML já autorizado e registrar o horário do envio simulado.
5. Depois de três dias completos sem resposta, chamar `POST /api/emails/{email_id}/follow-up`. Confirmar rascunho de até quatro linhas, mesmo link e somente um registro em `ds_followups` para o lead. Repetir deve devolver duplicidade, sem novo rascunho.
6. Revogar pelo endpoint administrativo `DELETE /api/proposals/{proposal_id}/public`; confirmar que o link retorna `404` idêntico ao de token inválido.

## Consultas de evidência

Executar no console HML autorizado, substituindo apenas IDs do run de E2E:

```sql
select id, lead_slug, status, artifacts->'commercial_snapshot' as commercial_snapshot,
       artifacts->'public_proposal' as publication
from public.ds_proposals where id = :proposal_id;

select id, lead_slug, proposal_id, status, template, subject, body
from public.ds_emails where proposal_id = :proposal_id order by created_at;

select id, lead_slug, email_id, status, due_at, detail
from public.ds_followups where lead_slug = :lead_slug order by created_at;
```

Não selecionar nem exportar token em claro: `artifacts.public_proposal` deve conter somente `token_hash`, timestamps e metadados de publicação/revogação.

## Cleanup

Usar exclusivamente o cleanup E2E já versionado com o `run-id` declarado e a confirmação exigida pelo script. Não apagar registros fora do lead/run E2E; pedidos pagos e suas dependências são preservados pelo cleanup fail-closed.
