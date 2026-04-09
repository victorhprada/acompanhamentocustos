-- Migration 003: Change INTEGER columns in monthly_records to NUMERIC
-- Allows decimal values for fields like vidas_cobradas, elegiveis, etc.

ALTER TABLE monthly_records
  ALTER COLUMN elegiveis_contrato TYPE NUMERIC(15,4),
  ALTER COLUMN elegiveis TYPE NUMERIC(15,4),
  ALTER COLUMN elegiveis_totalpass_gympass TYPE NUMERIC(15,4),
  ALTER COLUMN vidas_cobradas TYPE NUMERIC(15,4),
  ALTER COLUMN nr_vidas TYPE NUMERIC(15,4),
  ALTER COLUMN nr_cartao_contrato_flex TYPE NUMERIC(15,4),
  ALTER COLUMN nr_cartao_carga_flex TYPE NUMERIC(15,4);
