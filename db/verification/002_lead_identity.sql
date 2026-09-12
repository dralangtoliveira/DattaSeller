BEGIN;

DO $$
DECLARE
  v_first uuid;
  v_second uuid;
  v_count integer;
BEGIN
  SELECT lead_id INTO v_first FROM upsert_lead_identity(
    'Ana Example', 'ana@example.test', '+1 (212) 555-0100', '+12125550100', 'pilot', 'row-1'
  );
  SELECT lead_id INTO v_second FROM upsert_lead_identity(
    'Ana Example Updated', 'different@example.test', '+1 212 555 0100', '+12125550100', 'second-import', 'row-9'
  );

  IF v_first <> v_second THEN
    RAISE EXCEPTION 'same normalized phone created a duplicate lead';
  END IF;
  SELECT count(*) INTO v_count FROM lead_sources WHERE lead_id = v_first;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'lead origins were not preserved';
  END IF;

  SELECT lead_id INTO v_first FROM upsert_lead_identity(
    'No Phone', 'fallback@example.test', NULL, NULL, 'pilot', 'email-1'
  );
  SELECT lead_id INTO v_second FROM upsert_lead_identity(
    'No Phone Again', 'FALLBACK@example.test', NULL, NULL, 'second-import', 'email-2'
  );
  IF v_first <> v_second THEN
    RAISE EXCEPTION 'email fallback created a duplicate lead';
  END IF;
END;
$$;

ROLLBACK;
