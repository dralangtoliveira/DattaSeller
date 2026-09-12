# Identidade e deduplicação de leads

**Card:** CCD-8  
**Migration:** `db/migrations/002_lead_identity.sql`  
**Verificação:** `db/verification/002_lead_identity.sql`

`upsert_lead_identity` é a única entrada de importação para o MVP. A função toma um lock transacional da identidade antes de consultar ou gravar, impedindo que duas importações concorrentes criem o mesmo lead.

1. Usa `phone_normalized` E.164 como identidade prioritária.
2. Sem telefone, usa o e-mail em minúsculas como fallback.
3. Atualiza somente campos ausentes; não apaga informação já registrada.
4. Registra cada origem em `lead_sources`.
5. Recusa registros sem telefone normalizado e sem e-mail.

O script de verificação prova, dentro de uma transação revertida, que duas entradas com o mesmo telefone ou e-mail recebem o mesmo `lead_id` e que as duas origens ficam preservadas.
