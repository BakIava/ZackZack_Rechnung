-- Additive migration for onboarding trades and the centrally managed starter catalog.
-- Run after the base schema. No existing company, trade selection or service row is changed.

CREATE TABLE IF NOT EXISTS public.trades (
  id          text PRIMARY KEY,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trades_id_format CHECK (id ~ '^[a-z][a-z0-9_]*$')
);

INSERT INTO public.trades (id, sort_order)
VALUES
  ('painter', 10),
  ('carpenter', 20),
  ('windows_doors', 30),
  ('electrician', 40),
  ('tiler', 50),
  ('plumbing_heating', 60),
  ('drywall', 70),
  ('flooring', 80),
  ('gardening_landscaping', 90),
  ('cleaning', 100),
  ('other', 110)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.company_trades (
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trade_id    text NOT NULL REFERENCES public.trades(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, trade_id)
);

CREATE INDEX IF NOT EXISTS idx_company_trades_trade_id
  ON public.company_trades(trade_id);

CREATE TABLE IF NOT EXISTS public.service_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id        text NOT NULL REFERENCES public.trades(id) ON DELETE RESTRICT,
  description_de  text NOT NULL,
  description_tr  text NOT NULL,
  description_ar  text NOT NULL,
  unit            text NOT NULL,
  default_price   integer NOT NULL DEFAULT 0,
  category        text,
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  template_version integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_templates_description_de_not_blank
    CHECK (btrim(description_de) <> ''),
  CONSTRAINT service_templates_description_tr_not_blank
    CHECK (btrim(description_tr) <> ''),
  CONSTRAINT service_templates_description_ar_not_blank
    CHECK (btrim(description_ar) <> ''),
  CONSTRAINT service_templates_unit_not_blank
    CHECK (btrim(unit) <> ''),
  CONSTRAINT service_templates_version_positive
    CHECK (template_version > 0)
);

-- Makes the migration safe for installations where the template table already
-- exists from an earlier version.
ALTER TABLE public.service_templates
  ADD COLUMN IF NOT EXISTS default_price integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_service_templates_active_trade_sort
  ON public.service_templates(trade_id, sort_order, id)
  WHERE is_active;

DROP TRIGGER IF EXISTS trades_set_updated_at ON public.trades;
CREATE TRIGGER trades_set_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS service_templates_set_updated_at ON public.service_templates;
CREATE TRIGGER service_templates_set_updated_at
  BEFORE UPDATE ON public.service_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS starter_template_id uuid
  REFERENCES public.service_templates(id) ON DELETE SET NULL;

-- A manually created service may intentionally have the same description/unit.
-- Only repeated copies of the exact same template are considered duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS services_company_starter_template_unique
  ON public.services(company_id, starter_template_id)
  WHERE starter_template_id IS NOT NULL;

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trades_select_active ON public.trades;
CREATE POLICY trades_select_active ON public.trades
  FOR SELECT TO authenticated
  USING (is_active);

DROP POLICY IF EXISTS company_trades_all ON public.company_trades;
CREATE POLICY company_trades_all ON public.company_trades
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS service_templates_select_active ON public.service_templates;
CREATE POLICY service_templates_select_active ON public.service_templates
  FOR SELECT TO authenticated
  USING (is_active);

GRANT SELECT ON TABLE public.trades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_trades TO authenticated;
GRANT SELECT ON TABLE public.service_templates TO authenticated;

-- Keep the existing signature so deployments that already installed the old
-- function can upgrade it in place. trade_ids is carried inside company_data.
CREATE OR REPLACE FUNCTION public.complete_onboarding(company_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_company_id uuid;
  v_trade_ids text[];
  v_invalid_trade_ids text[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'onboarding_not_authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION USING MESSAGE = 'onboarding_already_completed';
  END IF;

  IF jsonb_typeof(company_data->'trade_ids') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING MESSAGE = 'onboarding_trades_invalid';
  END IF;

  SELECT array_agg(DISTINCT trade_id ORDER BY trade_id)
    INTO v_trade_ids
  FROM jsonb_array_elements_text(company_data->'trade_ids') AS selected(trade_id);

  IF COALESCE(array_length(v_trade_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'onboarding_trades_required';
  END IF;

  SELECT array_agg(selected_trade_id ORDER BY selected_trade_id)
    INTO v_invalid_trade_ids
  FROM unnest(v_trade_ids) AS selected(selected_trade_id)
  LEFT JOIN public.trades trade
    ON trade.id = selected.selected_trade_id
   AND trade.is_active
  WHERE trade.id IS NULL;

  IF COALESCE(array_length(v_invalid_trade_ids, 1), 0) > 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'onboarding_trades_invalid';
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'onboarding_not_authenticated';
  END IF;

  IF COALESCE(btrim(company_data->>'steuernummer'), '') = ''
     AND COALESCE(btrim(company_data->>'ust_id'), '') = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'onboarding_tax_id_required';
  END IF;

  INSERT INTO public.companies (
    name, legal_form, street, street_no, postcode, city,
    phone, mobile, fax, email, director,
    steuernummer, ust_id, registergericht, handelsregister_nr,
    kleinunternehmer, bank_name, iban, bic, account_holder, logo_url
  ) VALUES (
    company_data->>'name',
    NULLIF(company_data->>'legal_form', ''),
    NULLIF(company_data->>'street', ''),
    NULLIF(company_data->>'street_no', ''),
    NULLIF(company_data->>'postcode', ''),
    NULLIF(company_data->>'city', ''),
    NULLIF(company_data->>'phone', ''),
    NULLIF(company_data->>'mobile', ''),
    NULLIF(company_data->>'fax', ''),
    NULLIF(company_data->>'email', ''),
    NULLIF(company_data->>'director', ''),
    NULLIF(company_data->>'steuernummer', ''),
    NULLIF(company_data->>'ust_id', ''),
    NULLIF(company_data->>'registergericht', ''),
    NULLIF(company_data->>'handelsregister_nr', ''),
    COALESCE((company_data->>'kleinunternehmer')::boolean, true),
    NULLIF(company_data->>'bank_name', ''),
    NULLIF(company_data->>'iban', ''),
    NULLIF(company_data->>'bic', ''),
    NULLIF(company_data->>'account_holder', ''),
    NULLIF(company_data->>'logo_url', '')
  )
  RETURNING id INTO v_company_id;

  INSERT INTO public.users (id, company_id, email)
  VALUES (v_user_id, v_company_id, v_email);

  INSERT INTO public.company_trades (company_id, trade_id)
  SELECT v_company_id, trade_id
  FROM unnest(v_trade_ids) AS selected(trade_id)
  ON CONFLICT (company_id, trade_id) DO NOTHING;

  INSERT INTO public.services (
    company_id,
    description_de,
    description_tr,
    description_ar,
    unit,
    default_price,
    starter_template_id
  )
  SELECT
    v_company_id,
    template.description_de,
    template.description_tr,
    template.description_ar,
    template.unit,
    template.default_price,
    template.id
  FROM public.service_templates template
  WHERE template.is_active
    AND template.trade_id = ANY(v_trade_ids)
  ORDER BY template.trade_id, template.sort_order, template.id
  ON CONFLICT (company_id, starter_template_id)
    WHERE starter_template_id IS NOT NULL
    DO NOTHING;

  RETURN v_company_id;
EXCEPTION
  WHEN unique_violation THEN
    IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
      RAISE EXCEPTION USING MESSAGE = 'onboarding_already_completed';
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_onboarding(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(jsonb) TO authenticated;

-- Intentionally no service_templates seed data here. Add reviewed starter
-- services in a separate SQL script after the product lists are approved.
