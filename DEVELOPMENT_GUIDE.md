# Sistema de Acompanhamento de Custos - Development Guide

## Overview

**Project:** Monthly Cost Tracking System for Controller Team  
**Methodology:** SDD (Spec-Driven Development)  
**Database:** Supabase (PostgreSQL) with Row Level Security (RLS)  
**Access Control:** Role-based (Admin, Analyst, Viewer)  
**Domain:** Corporate benefits cost tracking (Gympass/Totalpass, Wiipo, Flex)  
**Spec Format:** Gherkin/Cucumber (BDD)

### Business Context

The controller team currently manages costs via Excel spreadsheets with monthly records. This system digitizes that workflow:

- **Companies** (empresas) - Client/company registry data
- **Monthly Records** - Per-company, per-product, per-month cost data
- **Products:** Gympass, Totalpass, Wiipo, Flex
- **View:** Month-by-month display until a company is deactivated

---

## Tech Stack

- **Backend:** Python + FastAPI
- **Frontend:** React + TypeScript + Vite
- **Database:** Supabase (PostgreSQL) with RLS
- **Specs:** Gherkin + Behave (Python BDD)
- **Styling:** Tailwind CSS

---

## SDD Methodology

### Core Principle
**Specifications are the source of truth.** All development flows from executable specs:

```
Write Spec (Gherkin) → Spec Fails (RED) → Implement Code → Spec Passes (GREEN) → Refactor
```

---

## Database Schema

### Companies (Empresas)

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(50) NOT NULL,               -- Identificador interno / rótulo de grupo (pode se repetir)
  empresa VARCHAR(255) NOT NULL,                  -- Nome fantasia
  cnpj VARCHAR(18) NOT NULL,                      -- CNPJ
  razao_social VARCHAR(255),                      -- Razão Social
  cliente VARCHAR(255),                           -- Nome do contato
  email_envio VARCHAR(255),                       -- E-mail para envio
  inicio_cobranca DATE,                           -- Início Cobrança
  vencimento INTEGER,                             -- Dia de vencimento
  nota_fiscal_descricao TEXT,                     -- Descrição na NF
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Monthly Records (Registros Mensais)

Cada linha = 1 empresa + 1 produto + 1 mês

```sql
CREATE TABLE monthly_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Período e Produto
  mes_ano DATE NOT NULL,                          -- Primeiro dia do mês
  produto VARCHAR(100) NOT NULL,                  -- Gympass, Totalpass, Wiipo, Flex
  
  -- Elegíveis
  elegiveis_contrato INTEGER,                     -- ELEGÍVEIS CONTRATO
  elegiveis INTEGER,                              -- ELEGÍVEIS (qtd real)
  valor_elegivel DECIMAL(15,2),                   -- VALOR ELEGÍVEL
  valor_final DECIMAL(15,2),                      -- VALOR FINAL
  elegiveis_totalpass_gympass INTEGER,            -- ELEGÍVEIS Totalpass/Gympass
  
  -- Gympass/Totalpass
  vidas_cobradas INTEGER,                         -- Vidas cobradas
  nr_vidas INTEGER,                               -- Nº Vidas
  valor_vidas DECIMAL(15,2),                      -- Valor Vidas
  
  -- Flex
  nr_cartao_contrato_flex INTEGER,                -- nº Cartão contrato c/ Flex
  nr_cartao_carga_flex INTEGER,                   -- nº Cartão com Carga Flex
  rs_carregado DECIMAL(15,2),                     -- R$ Carregado
  media_cartao_realizado DECIMAL(15,2),           -- Média por Cartão Realizado
  media_contratada DECIMAL(15,2),                 -- Média Contratada
  
  -- Wiipo
  valor_elegivel_wiipo DECIMAL(15,2),             -- Valor por Elegível Wiipo
  faturamento_wiipo DECIMAL(15,2),                -- Faturamento Wiipo
  
  -- Financeiro
  mensal_x_rentabilidade VARCHAR(100),            -- MENSAL X RENTABILIDADE
  custo_por_cliente DECIMAL(15,2),                -- Custo por Cliente
  valor_faturado DECIMAL(15,2),                   -- Valor Faturado
  faturamento DECIMAL(15,2),                      -- Faturamento
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique: empresa + produto + mês
CREATE UNIQUE INDEX idx_monthly_records_unique 
  ON monthly_records(company_id, produto, mes_ano);

-- Indexes
CREATE INDEX idx_monthly_records_mes_ano ON monthly_records(mes_ano);
CREATE INDEX idx_monthly_records_produto ON monthly_records(produto);
CREATE INDEX idx_monthly_records_company ON monthly_records(company_id);
```

### RLS Policies

```sql
-- Companies
CREATE POLICY "Authenticated users can view companies"
  ON companies FOR SELECT USING (is_active = true OR has_role('admin'));

CREATE POLICY "Admin/Analyst can create companies"
  ON companies FOR INSERT WITH CHECK (has_role('analyst'));

CREATE POLICY "Admin/Analyst can update companies"
  ON companies FOR UPDATE USING (has_role('analyst'));

CREATE POLICY "Admin can delete companies"
  ON companies FOR DELETE USING (has_role('admin'));

-- Monthly Records
CREATE POLICY "All roles can view monthly records"
  ON monthly_records FOR SELECT USING (true);

CREATE POLICY "Admin/Analyst can create monthly records"
  ON monthly_records FOR INSERT WITH CHECK (has_role('analyst'));

CREATE POLICY "Admin/Analyst can update monthly records"
  ON monthly_records FOR UPDATE USING (has_role('analyst'));

CREATE POLICY "Admin can delete monthly records"
  ON monthly_records FOR DELETE USING (has_role('admin'));
```

---

## Feature Specs

### 1. Companies Management

```gherkin
Feature: Companies Management
  As an analyst
  I want to manage company registry data
  So that monthly cost records can be associated with companies

  Background:
    Given I am logged in as an analyst

  Scenario: Register a new company
    Given I am on the "New Company" page
    When I fill in the company form:
      | company_id     | EMP001          |
      | empresa        | Empresa Alpha   |
      | cnpj           | 12.345.678/0001-90 |
      | razao_social   | Alpha Ltda      |
      | cliente        | João Silva      |
      | email_envio    | joao@alpha.com  |
    And I click "Save"
    Then the company is created
    And I see it in the companies list

  Scenario: Deactivate a company
    Given a company "Empresa Alpha" exists
    When I click "Deactivate"
    Then the company is marked as inactive
    And it no longer appears in the active list
    But its monthly records are preserved
```

### 2. Monthly Records

```gherkin
Feature: Monthly Cost Records
  As an analyst
  I want to enter monthly cost data per product
  So that the controller team can track expenses

  Background:
    Given company "Empresa Alpha" exists
    And I am logged in as an analyst

  Scenario: Add monthly record for a product
    Given I am viewing company "Empresa Alpha" for month "January 2026"
    When I add a new record for product "Gympass"
    And I fill in:
      | elegiveis_contrato    | 100   |
      | elegiveis             | 95    |
      | vidas_cobradas        | 90    |
      | valor_final           | 15000 |
    And I click "Save"
    Then the monthly record is created
    And I see it in the month's table

  Scenario: Month view shows all products
    Given company "Empresa Alpha" has records for "January 2026"
    When I view the month "January 2026"
    Then I see rows for each product: Gympass, Totalpass, Wiipo, Flex
    And I can edit each product's values inline

  Scenario: Duplicate month detection
    Given a monthly record exists for "Empresa Alpha" + "Gympass" + "January 2026"
    When I try to add another record for the same company + product + month
    Then I see an error "Record already exists for this month and product"

  Scenario: View companies month by month
    Given company "Empresa Alpha" has records from "January 2026" to "April 2026"
    When I navigate to the company detail page
    Then I see a timeline of months: Jan, Feb, Mar, Apr
    And I can click each month to see its records
```

### 3. Role-Based Access

```gherkin
Feature: Role-Based Access Control
  As a system administrator
  I want to enforce role-based permissions
  So that data is protected

  Scenario: Viewer can only view
    Given I am logged in as "viewer"
    When I view companies and monthly records
    Then I can see all data
    But I cannot create, edit, or delete anything

  Scenario: Analyst can manage but not delete
    Given I am logged in as "analyst"
    When I create or update companies and records
    Then the operations succeed
    But when I try to delete
    Then the operation is denied

  Scenario: Admin can do everything
    Given I am logged in as "admin"
    When I perform any operation
    Then all operations are allowed
```

---

## API Endpoints

### Companies
```
GET    /api/v1/companies                      # List companies (with filters)
GET    /api/v1/companies/{id}                 # Get company details
GET    /api/v1/companies/{id}/monthly         # Get all monthly records
POST   /api/v1/companies                      # Create company (analyst+)
PUT    /api/v1/companies/{id}                 # Update company (analyst+)
DELETE /api/v1/companies/{id}                 # Delete company (admin only)
POST   /api/v1/companies/{id}/deactivate      # Deactivate company (analyst+)
```

### Monthly Records
```
GET    /api/v1/monthly                        # List all monthly records
GET    /api/v1/monthly?mes_ano=2026-01-01     # Filter by month
GET    /api/v1/monthly?company_id={id}        # Filter by company
GET    /api/v1/companies/{id}/monthly/{mes}   # Get month for company
POST   /api/v1/monthly                        # Create record (analyst+)
PUT    /api/v1/monthly/{id}                   # Update record (analyst+)
DELETE /api/v1/monthly/{id}                   # Delete record (admin only)
PATCH  /api/v1/monthly/bulk                   # Bulk update (analyst+)
```

---

## Project Structure

```
acompanhamentodecustos/
├── specs/
│   ├── system/
│   │   ├── system_overview.feature
│   │   ├── security_model.feature
│   │   └── data_model.feature
│   ├── features/
│   │   ├── authentication.feature
│   │   ├── companies.feature
│   │   ├── monthly_records.feature
│   │   ├── reporting.feature
│   │   └── bulk_operations.feature
│   ├── steps/
│   │   ├── system_steps.py
│   │   ├── auth_steps.py
│   │   ├── company_steps.py
│   │   └── monthly_steps.py
│   └── environment.py
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/v1/
│   │   │   ├── router.py
│   │   │   ├── companies.py
│   │   │   ├── monthly.py
│   │   │   └── auth.py
│   │   ├── models/
│   │   │   ├── company.py
│   │   │   └── monthly_record.py
│   │   ├── schemas/
│   │   │   ├── company.py
│   │   │   └── monthly_record.py
│   │   ├── services/
│   │   └── repositories/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_companies_monthly_records.sql
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Companies/
│   │   │   │   ├── CompanyList.tsx
│   │   │   │   ├── CompanyDetail.tsx
│   │   │   │   └── CompanyForm.tsx
│   │   │   ├── Monthly/
│   │   │   │   ├── MonthView.tsx
│   │   │   │   ├── MonthTable.tsx
│   │   │   │   └── RecordForm.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Login.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   └── package.json
│
├── DEVELOPMENT_GUIDE.md
├── README.md
├── CLAUDE.md
└── behave.ini
```

---

## Development Phases

### Phase 1: Foundation ✅ (DONE)
- [x] Supabase schema applied
- [x] RLS policies
- [x] Database validation specs passing

### Phase 2: Companies CRUD
**Specs:** `companies.feature`  
**Tasks:**
1. [ ] Companies API endpoints
2. [ ] Companies list page
3. [ ] Company create/edit form
4. [ ] Company deactivate
5. [ ] Specs GREEN

### Phase 3: Monthly Records
**Specs:** `monthly_records.feature`  
**Tasks:**
1. [ ] Monthly records API
2. [ ] Month view UI (table per product)
3. [ ] Record create/edit form
4. [ ] Duplicate month validation
5. [ ] Month-by-month navigation
6. [ ] Specs GREEN

### Phase 4: Bulk Operations & Export
**Tasks:**
1. [ ] Bulk update records
2. [ ] Import from Excel/CSV
3. [ ] Export to CSV
4. [ ] Dashboard with KPIs

### Phase 5: Audit & Polish
1. [ ] Audit log viewer
2. [ ] Performance optimization
3. [ ] Full test coverage
4. [ ] Production deployment

---

## Running Specs

```bash
# All specs
behave specs/

# System specs only
behave specs/system/

# Specific feature
behave specs/features/companies.feature

# By role tag
behave specs/ --tags=analyst
behave specs/ --tags=viewer
behave specs/ --tags=admin
```

---

## Environment Variables

```bash
# Backend .env
SUPABASE_URL=https://yoeurzimmmzpgjvnkqcx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
DATABASE_URL=postgresql://postgres:...@db.yoeurzimmmzpgjvnkqcx.supabase.co:5432/postgres
SECRET_KEY=change-me
API_V1_STR=/api/v1

# Frontend .env
VITE_SUPABASE_URL=https://yoeurzimmmzpgjvnkqcx.supabase.co
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Key Commands

```bash
# Backend
cd backend && uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Specs
behave specs/

# Database
python -c "
import psycopg2; conn = psycopg2.connect('DATABASE_URL')
with open('backend/migrations/002_companies_monthly_records.sql') as f:
    conn.cursor().execute(f.read()); conn.commit()
"
```
