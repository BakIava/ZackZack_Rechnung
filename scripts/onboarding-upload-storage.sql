-- Run once in the Supabase SQL Editor before enabling onboarding extraction.
-- Private temporary bucket. Only service-role code and one-time signed upload
-- tokens access objects; there are deliberately no anon/authenticated policies.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'onboarding-uploads',
  'onboarding-uploads',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
