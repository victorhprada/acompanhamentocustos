-- Dependentes Gympass/Totalpass (custo)
ALTER TABLE monthly_records
  ADD COLUMN IF NOT EXISTS qtd_dependentes_gympass NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS custo_por_dependente NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS total_custo_dependentes NUMERIC(15,4);

COMMENT ON COLUMN monthly_records.qtd_dependentes_gympass IS 'Qtd de Dependentes (Gympass/Totalpass)';
COMMENT ON COLUMN monthly_records.custo_por_dependente IS 'Custo por Dependente (Gympass/Totalpass)';
COMMENT ON COLUMN monthly_records.total_custo_dependentes IS 'Qtd × Custo por Dependente';
