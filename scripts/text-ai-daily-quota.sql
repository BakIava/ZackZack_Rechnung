-- Run this once in the Supabase SQL Editor before enabling "Text verbessern".
--
-- Enforces at most 50 Claude-backed text corrections per authenticated user
-- and UTC calendar day. Separate from consume_customer_ai_quota (customer,
-- service location and Nachweis share that one), so frequent text corrections
-- never use up the more expensive Nachweis reads. The counter is reserved
-- before Claude is called; invalid input never reaches this function.

CREATE TABLE IF NOT EXISTS public.text_ai_usage_daily (
  user_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date    date        NOT NULL,
  request_count smallint    NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date),
  CONSTRAINT text_ai_usage_daily_request_count_range
    CHECK (request_count BETWEEN 0 AND 50)
);

ALTER TABLE public.text_ai_usage_daily ENABLE ROW LEVEL SECURITY;

-- There are deliberately no direct table policies. Authenticated users can
-- neither inspect nor manipulate counters; access is only through the RPC.
REVOKE ALL ON TABLE public.text_ai_usage_daily FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_text_ai_quota()
RETURNS TABLE (allowed boolean, remaining integer, daily_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_usage_date date;
  v_request_count smallint;
  v_daily_limit constant smallint := 50;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_usage_date := (statement_timestamp() AT TIME ZONE 'UTC')::date;

  INSERT INTO public.text_ai_usage_daily (
    user_id,
    usage_date,
    request_count
  ) VALUES (
    v_user_id,
    v_usage_date,
    1
  )
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET request_count = text_ai_usage_daily.request_count + 1,
        updated_at = now()
    WHERE text_ai_usage_daily.request_count < v_daily_limit
  RETURNING request_count INTO v_request_count;

  IF v_request_count IS NULL THEN
    RETURN QUERY SELECT false, 0, v_daily_limit::integer;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    (v_daily_limit - v_request_count)::integer,
    v_daily_limit::integer;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_text_ai_quota() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_text_ai_quota() TO authenticated;
