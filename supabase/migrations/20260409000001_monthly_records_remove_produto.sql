-- Remove all existing monthly records (fresh import)
TRUNCATE TABLE monthly_records;

-- Drop produto column and related indexes
DROP INDEX IF EXISTS idx_monthly_records_unique;
DROP INDEX IF EXISTS idx_monthly_records_produto;

ALTER TABLE monthly_records DROP COLUMN IF EXISTS produto;

-- New unique constraint: one record per company per month
CREATE UNIQUE INDEX idx_monthly_records_unique ON monthly_records(company_id, mes_ano);
