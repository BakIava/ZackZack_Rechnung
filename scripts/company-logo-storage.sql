-- Run once in the Supabase SQL Editor before enabling company-logo uploads.
--
-- Logos are public brand assets because HTML previews load their stable URL.
-- Writes remain RLS-protected: an authenticated user may only access the
-- directory named after their own company_id. SVG is accepted by the app but
-- is validated and rasterized server-side, so Storage only receives PNG/JPEG.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS company_logos_select_own ON storage.objects;
DROP POLICY IF EXISTS company_logos_insert_own ON storage.objects;
DROP POLICY IF EXISTS company_logos_update_own ON storage.objects;
DROP POLICY IF EXISTS company_logos_delete_own ON storage.objects;

CREATE POLICY company_logos_select_own
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);

CREATE POLICY company_logos_insert_own
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);

CREATE POLICY company_logos_update_own
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
)
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);

CREATE POLICY company_logos_delete_own
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = public.get_user_company_id()::text
);
