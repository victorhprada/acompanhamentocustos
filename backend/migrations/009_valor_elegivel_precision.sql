-- Custo por Vida e Valor vida Wiipo precisam de mais casas para os cálculos Wellhub
ALTER TABLE monthly_records
  ALTER COLUMN valor_elegivel TYPE NUMERIC(15,6),
  ALTER COLUMN valor_elegivel_wiipo TYPE NUMERIC(15,6);

COMMENT ON COLUMN monthly_records.valor_elegivel IS 'Custo por Vida — precisão estendida (não arredondar em 2 casas)';
COMMENT ON COLUMN monthly_records.valor_elegivel_wiipo IS 'Valor vida Wiipo — precisão estendida (não arredondar em 2 casas)';
