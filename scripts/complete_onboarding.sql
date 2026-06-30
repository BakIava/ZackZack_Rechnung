-- Run this in the Supabase SQL Editor (once, before deploying the onboarding action).
-- Creates an atomic function that inserts both companies and public.users in a single
-- transaction so a failed second INSERT never leaves an orphaned company row.

CREATE OR REPLACE FUNCTION complete_onboarding(company_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid;
  v_email    text;
  v_company_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  v_company_id := gen_random_uuid();

  INSERT INTO companies (
    id, name, legal_form, street, street_no, postcode, city,
    phone, mobile, fax, email, director,
    steuernummer, ust_id, registergericht, handelsregister_nr,
    kleinunternehmer, bank_name, iban, bic, account_holder, logo_url
  ) VALUES (
    v_company_id,
    company_data->>'name',
    company_data->>'legal_form',
    company_data->>'street',
    company_data->>'street_no',
    company_data->>'postcode',
    company_data->>'city',
    NULLIF(company_data->>'phone', ''),
    NULLIF(company_data->>'mobile', ''),
    NULLIF(company_data->>'fax', ''),
    NULLIF(company_data->>'email', ''),
    NULL,
    company_data->>'steuernummer',
    NULLIF(company_data->>'ust_id', ''),
    NULLIF(company_data->>'registergericht', ''),
    NULLIF(company_data->>'handelsregister_nr', ''),
    COALESCE((company_data->>'kleinunternehmer')::boolean, true),
    NULLIF(company_data->>'bank_name', ''),
    NULLIF(company_data->>'iban', ''),
    NULLIF(company_data->>'bic', ''),
    NULLIF(company_data->>'account_holder', ''),
    NULLIF(company_data->>'logo_url', '')
  );

  INSERT INTO public.users (id, company_id, email)
  VALUES (v_user_id, v_company_id, v_email);

  RETURN v_company_id;
END;
$$;

-- Revoke public execute so only authenticated callers (via the anon key) can call it.
-- The function checks auth.uid() internally.
REVOKE ALL ON FUNCTION complete_onboarding(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_onboarding(jsonb) TO authenticated;
