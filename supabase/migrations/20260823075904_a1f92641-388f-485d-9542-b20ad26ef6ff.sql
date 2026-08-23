ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS admin1 text,
  ADD COLUMN IF NOT EXISTS admin2 text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS geo_id text;

CREATE UNIQUE INDEX IF NOT EXISTS cities_geo_id_key ON public.cities (geo_id) WHERE geo_id IS NOT NULL;

GRANT INSERT ON public.cities TO authenticated;

DROP POLICY IF EXISTS "authenticated can add discovered cities" ON public.cities;
CREATE POLICY "authenticated can add discovered cities"
  ON public.cities FOR INSERT TO authenticated
  WITH CHECK (geo_id IS NOT NULL);