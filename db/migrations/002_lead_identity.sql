BEGIN;

CREATE OR REPLACE FUNCTION upsert_lead_identity(
  p_full_name text,
  p_email text,
  p_phone_original text,
  p_phone_normalized text,
  p_source text,
  p_source_record_id text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_lead_group text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL
) RETURNS TABLE (lead_id uuid, operation text)
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_lead_id uuid;
  v_key text;
BEGIN
  IF p_phone_normalized IS NULL AND p_email IS NULL THEN
    RAISE EXCEPTION 'A normalized phone or email is required for lead identity';
  END IF;

  v_key := COALESCE(p_phone_normalized, lower(p_email));
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

  SELECT id INTO v_lead_id
  FROM leads
  WHERE phone_normalized = p_phone_normalized
     OR (p_phone_normalized IS NULL AND phone_normalized IS NULL AND lower(email) = lower(p_email))
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    INSERT INTO leads (
      full_name, email, phone_original, phone_normalized, source,
      category, lead_group, company_id, owner_id
    ) VALUES (
      p_full_name, p_email, p_phone_original, p_phone_normalized, p_source,
      p_category, p_lead_group, p_company_id, p_owner_id
    ) RETURNING id INTO v_lead_id;
    operation := 'inserted';
  ELSE
    UPDATE leads
    SET full_name = COALESCE(leads.full_name, p_full_name),
        email = COALESCE(leads.email, p_email),
        phone_original = COALESCE(leads.phone_original, p_phone_original),
        category = COALESCE(leads.category, p_category),
        lead_group = COALESCE(leads.lead_group, p_lead_group),
        company_id = COALESCE(leads.company_id, p_company_id),
        owner_id = COALESCE(leads.owner_id, p_owner_id),
        updated_at = now()
    WHERE id = v_lead_id;
    operation := 'updated';
  END IF;

  INSERT INTO lead_sources (lead_id, source, source_record_id)
  VALUES (v_lead_id, p_source, COALESCE(p_source_record_id, ''))
  ON CONFLICT DO NOTHING;

  lead_id := v_lead_id;
  RETURN NEXT;
END;
$$;

COMMIT;
