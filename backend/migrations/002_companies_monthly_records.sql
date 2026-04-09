-- =====================================================
-- Migration 002: Companies & Monthly Records
-- Replaces the generic cost tracking model
-- =====================================================

-- Drop old tables if they exist (for re-running during development)
DROP TABLE IF EXISTS monthly_records CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Drop audit_log if exists (will be recreated)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Recreate audit_logs table (was dropped above)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view audit logs" ON audit_logs;
CREATE POLICY "Admin can view audit logs"
  ON audit_logs FOR SELECT USING (has_role('admin'));

-- Recreate audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPANIES - Dados cadastrais da empresa/cliente
-- =====================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(50) UNIQUE NOT NULL,         -- Identificador interno
  empresa VARCHAR(255) NOT NULL,                   -- Nome fantasia
  cnpj VARCHAR(18) NOT NULL,                       -- CNPJ
  razao_social VARCHAR(255),                       -- Razão Social
  cliente VARCHAR(255),                            -- Nome do contato/cliente
  email_envio VARCHAR(255),                        -- E-mail para envio
  inicio_cobranca DATE,                            -- Início Cobrança
  vencimento INTEGER,                              -- Dia de vencimento (1-31)
  nota_fiscal_descricao TEXT,                      -- Descrição na Nota Fiscal
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MONTHLY_RECORDS - Dados mensais por produto
-- Cada linha = 1 empresa + 1 produto + 1 mês
-- =====================================================
CREATE TABLE monthly_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Período
  mes_ano DATE NOT NULL,                           -- Primeiro dia do mês (ex: 2026-01-01)
  produto VARCHAR(100) NOT NULL,                   -- Gympass, Totalpass, Wiipo, Flex
  
  -- Elegíveis
  elegiveis_contrato INTEGER,                      -- ELEGÍVEIS CONTRATO
  elegiveis INTEGER,                               -- ELEGÍVEIS (qtd real)
  valor_elegivel DECIMAL(15,2),                    -- VALOR ELEGÍVEL
  valor_final DECIMAL(15,2),                       -- VALOR FINAL
  elegiveis_totalpass_gympass INTEGER,             -- ELEGÍVEIS Totalpass/Gympass
  
  -- Gympass/Totalpass
  vidas_cobradas INTEGER,                          -- Vidas cobradas Gympass/Totalpass
  nr_vidas INTEGER,                                -- Nº Vidas
  valor_vidas DECIMAL(15,2),                       -- Valor Vidas
  
  -- Flex
  nr_cartao_contrato_flex INTEGER,                 -- nº Cartão contrato c/ Flex
  nr_cartao_carga_flex INTEGER,                    -- nº Cartão com Carga Flex
  rs_carregado DECIMAL(15,2),                      -- R$ Carregado
  media_cartao_realizado DECIMAL(15,2),            -- Média por Cartão Realizado base contrato Premium
  media_contratada DECIMAL(15,2),                  -- Média Contratada
  
  -- Wiipo
  valor_elegivel_wiipo DECIMAL(15,2),              -- Valor por Elegível Wiipo
  faturamento_wiipo DECIMAL(15,2),                 -- Faturamento Wiipo
  
  -- Financeiro
  mensal_x_rentabilidade VARCHAR(100),             -- MENSAL X RENTABILIDADE
  custo_por_cliente DECIMAL(15,2),                 -- Custo por Cliente
  valor_faturado DECIMAL(15,2),                    -- Valor Faturado
  faturamento DECIMAL(15,2),                       -- Faturamento
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: empresa + produto + mês
CREATE UNIQUE INDEX idx_monthly_records_unique 
  ON monthly_records(company_id, produto, mes_ano);

-- Indexes
CREATE INDEX idx_monthly_records_mes_ano ON monthly_records(mes_ano);
CREATE INDEX idx_monthly_records_produto ON monthly_records(produto);
CREATE INDEX idx_monthly_records_company ON monthly_records(company_id);
CREATE INDEX idx_monthly_records_is_active ON companies(is_active);
CREATE INDEX idx_companies_cnpj ON companies(cnpj);
CREATE UNIQUE INDEX idx_companies_cnpj_unique ON companies(cnpj);
CREATE INDEX idx_companies_company_id ON companies(company_id);

-- =====================================================
-- Enable RLS
-- =====================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_records ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies - Companies
-- =====================================================

-- All authenticated users can view active companies
CREATE POLICY "Authenticated users can view companies"
  ON companies FOR SELECT
  USING (is_active = true OR has_role('admin'));

-- Admin/Analyst can create companies
CREATE POLICY "Admin/Analyst can create companies"
  ON companies FOR INSERT
  WITH CHECK (has_role('analyst'));

-- Admin/Analyst can update companies
CREATE POLICY "Admin/Analyst can update companies"
  ON companies FOR UPDATE
  USING (has_role('analyst'));

-- Only Admin can delete companies
CREATE POLICY "Admin can delete companies"
  ON companies FOR DELETE
  USING (has_role('admin'));

-- =====================================================
-- RLS Policies - Monthly Records
-- =====================================================

-- All authenticated users can view monthly records
CREATE POLICY "All roles can view monthly records"
  ON monthly_records FOR SELECT
  USING (true);

-- Admin/Analyst can create monthly records
CREATE POLICY "Admin/Analyst can create monthly records"
  ON monthly_records FOR INSERT
  WITH CHECK (has_role('analyst'));

-- Admin/Analyst can update monthly records
CREATE POLICY "Admin/Analyst can update monthly records"
  ON monthly_records FOR UPDATE
  USING (has_role('analyst'));

-- Only Admin can delete monthly records
CREATE POLICY "Admin can delete monthly records"
  ON monthly_records FOR DELETE
  USING (has_role('admin'));

-- =====================================================
-- Audit Triggers
-- =====================================================

DROP TRIGGER IF EXISTS audit_companies ON companies;
CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_monthly_records ON monthly_records;
CREATE TRIGGER audit_monthly_records
  AFTER INSERT OR UPDATE OR DELETE ON monthly_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
