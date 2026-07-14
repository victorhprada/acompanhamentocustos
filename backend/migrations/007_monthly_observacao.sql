-- Observações mensais (não propagadas entre meses)
ALTER TABLE monthly_records
  ADD COLUMN IF NOT EXISTS observacao TEXT;

COMMENT ON COLUMN monthly_records.observacao IS 'Observações livres do mês; não propagar para outros meses';
