-- company_id is a group label (can be shared by matriz/filial); CNPJ remains unique
ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_company_id_key;

DROP INDEX IF EXISTS companies_company_id_key;

-- Keep a non-unique index for search/filter
CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id);

COMMENT ON COLUMN companies.company_id IS 'Identificador interno / rótulo de grupo (pode se repetir entre empresas do mesmo grupo)';
