-- DS-SEC-03 / DS-SEC-04
-- Hardening idempotente de funções já existentes. Não altera dados, tabelas,
-- policies, triggers ou regras comerciais.
begin;

do $$
begin
  if to_regprocedure('public.upsert_lead_identity(text,text,text,text,text,text,text,text,uuid,uuid)') is not null then
    execute 'alter function public.upsert_lead_identity(text,text,text,text,text,text,text,text,uuid,uuid) set search_path to pg_catalog, public';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    -- O event trigger continua ativo; apenas a chamada direta por papéis de
    -- aplicação deixa de ser permitida.
    execute 'revoke execute on function public.rls_auto_enable() from public';
    execute 'revoke execute on function public.rls_auto_enable() from anon';
    execute 'revoke execute on function public.rls_auto_enable() from authenticated';
  end if;
end
$$;

commit;
