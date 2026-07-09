-- Campos de dependentes nos registros mensais
ALTER TABLE monthly_records
  ADD COLUMN IF NOT EXISTS qtd_dependentes NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS valor_por_dependente NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS faturamento_dependentes NUMERIC(15,4);

COMMENT ON COLUMN monthly_records.qtd_dependentes IS 'Quantidade de dependentes';
COMMENT ON COLUMN monthly_records.valor_por_dependente IS 'Valor cobrado por dependente';
COMMENT ON COLUMN monthly_records.faturamento_dependentes IS 'Qtd Dependentes × Valor por dependente';
