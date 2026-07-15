-- PRO RATA específico para cálculo de custo de dependentes
ALTER TABLE monthly_records
  ADD COLUMN IF NOT EXISTS pro_rata_dependente NUMERIC(15,4);

COMMENT ON COLUMN monthly_records.pro_rata_dependente IS 'PRO RATA (dias) usado no Total de Custo por Dependente';
COMMENT ON COLUMN monthly_records.total_custo_dependentes IS '(Custo × Qtd / 30) × PRO RATA Dependente, 2 casas decimais';
