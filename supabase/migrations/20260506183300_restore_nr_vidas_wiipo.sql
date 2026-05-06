ALTER TABLE public.monthly_records
  ADD COLUMN IF NOT EXISTS nr_vidas NUMERIC(15,4);
