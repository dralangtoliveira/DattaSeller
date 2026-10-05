-- `ds_agent_jobs` guarda estado de execução agêntica (job, evidências, artefatos)
-- e chegou com `grant ... to anon` do esqueleto inicial. A RLS já barrava o anon
-- (SELECT devolvia [] e INSERT era recusado), mas manter privilégio de escrita
-- para a chave pública é privilégio em excesso: a mesma correção aplicada às
-- tabelas legadas do núcleo comercial passa a valer aqui.
--
-- Idempotente: revogar de novo é no-op. Reversível: reexecutar o grant original.
revoke all on table public.ds_agent_jobs from anon;
