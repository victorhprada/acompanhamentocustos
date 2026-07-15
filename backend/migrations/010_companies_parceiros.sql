-- Parceiros da empresa: Totalpass e/ou Wellhub
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS parceiros TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_parceiros_valid;

ALTER TABLE companies
  ADD CONSTRAINT companies_parceiros_valid
  CHECK (parceiros <@ ARRAY['totalpass', 'wellhub']::TEXT[]);

COMMENT ON COLUMN companies.parceiros IS 'Parceiros selecionados: totalpass e/ou wellhub';
