-- Tipo da empresa: matriz ou filial (mutuamente exclusivos)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tipo_empresa TEXT NOT NULL DEFAULT 'matriz';

ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_tipo_empresa_check;

ALTER TABLE companies
  ADD CONSTRAINT companies_tipo_empresa_check
  CHECK (tipo_empresa IN ('matriz', 'filial'));

COMMENT ON COLUMN companies.tipo_empresa IS 'Classificação da empresa: matriz ou filial';
