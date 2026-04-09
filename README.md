# Sistema de Acompanhamento de Custos

Sistema de gerenciamento de custos operacionais para a equipe de controladoria, desenvolvido com metodologia SDD (Spec-Driven Development).

## Status do Projeto

**Fase:** Setup inicial completo  
**Metodologia:** SDD com Gherkin/Behave  
**Specs:** ✅ Configuradas e rodando  
**Estado:** 🔴 RED (aguardando implementação)

## Stack

- **Backend:** Python + FastAPI
- **Frontend:** React + TypeScript + Vite
- **Database:** Supabase (PostgreSQL) com RLS
- **Specs:** Gherkin + Behave
- **Estilo:** Tailwind CSS

## Estrutura do Projeto

```
acompanhamentodecustos/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py            # Entry point
│   │   ├── config.py          # Settings
│   │   └── api/v1/            # API routes
│   ├── migrations/            # SQL migrations
│   │   └── 001_initial_schema.sql
│   └── requirements.txt
│
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── specs/                      # Gherkin specs (SDD)
│   ├── system/                # System-level specs
│   │   ├── system_overview.feature
│   │   ├── security_model.feature
│   │   └── data_model.feature
│   ├── features/              # Feature-level specs
│   │   ├── authentication.feature
│   │   └── cost_centers.feature
│   ├── steps/                 # Step definitions
│   │   ├── system_steps.py
│   │   └── auth_steps.py
│   └── environment.py
│
├── DEVELOPMENT_GUIDE.md       # Guia completo de desenvolvimento
├── CLAUDE.md                  # Agent directives
└── behave.ini                 # Behave configuration
```

## Quick Start

### 1. Setup do Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate no Windows
pip install -r requirements.txt
cp .env.example .env
# Edite .env com suas credenciais do Supabase
uvicorn app.main:app --reload
```

### 2. Setup do Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Rodar Specs (SDD)

```bash
# Rodar todas as specs
behave specs/

# Rodar apenas system specs
behave specs/system/

# Rodar feature específica
behave specs/features/authentication.feature

# Rodar com tags
behave specs/ --tags=analyst
behave specs/ --tags=admin
behave specs/ --tags=viewer

# Parar no primeiro erro
behave specs/ --stop
```

## Metodologia SDD

### Fluxo de Desenvolvimento

```
1. Escrever Spec (Gherkin)
2. Rodar Spec → RED ❌ (esperado)
3. Implementar código mínimo
4. Rodar Spec → GREEN ✅
5. Refatorar
6. Repetir
```

### Specs Atuais

#### System-Level
- ✅ `system_overview.feature` - Visão geral do sistema
- ✅ `security_model.feature` - Modelo de segurança e RLS
- ✅ `data_model.feature` - Modelo de dados

#### Feature-Level
- ✅ `authentication.feature` - Autenticação de usuários
- ✅ `cost_centers.feature` - Gerenciamento de centros de custo

### Status das Specs

```
System Specs:
  ✅ Security Model - RLS policies (passing)
  ✅ Data Model - Core tables (passing)
  🔴 System Overview - Cost management (failing - expected)

Feature Specs:
  ⏳ Authentication - Login flow (steps created)
  ⏳ Cost Centers - CRUD operations (steps created)
```

## Supabase Setup

### Usando o MCP

O projeto está configurado para usar o Supabase MCP. Para aplicar o schema:

1. Conecte-se ao seu projeto Supabase
2. Execute o migration: `backend/migrations/001_initial_schema.sql`
3. Verifique as políticas RLS
4. Crie usuários de teste

### Schema

O schema inclui:
- ✅ `profiles` - Perfis de usuários com roles
- ✅ `cost_centers` - Centros de custo
- ✅ `operational_costs` - Custos operacionais
- ✅ `cost_attachments` - Anexos de arquivos
- ✅ `audit_logs` - Logs de auditoria
- ✅ RLS policies para todos os tables
- ✅ Audit triggers automáticos

## Roles e Permissões

| Role    | View | Create | Update | Delete | Approve |
|---------|------|--------|--------|--------|---------|
| Viewer  | ✅   | ❌     | ❌     | ❌     | ❌      |
| Analyst | ✅   | ✅     | ✅     | ❌     | ✅      |
| Admin   | ✅   | ✅     | ✅     | ✅     | ✅      |

## Variáveis de Ambiente

### Backend (.env)

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
SECRET_KEY=change-me-in-production
```

### Frontend (.env)

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Próximos Passos

1. [ ] Aplicar schema no Supabase via MCP
2. [ ] Configurar autenticação de teste
3. [ ] Implementar Phase 1: Authentication & Cost Centers
4. [ ] Rodar specs até ficarem GREEN
5. [ ] Implementar Phase 2: Operational Costs

## Documentação

- [Development Guide](./DEVELOPMENT_GUIDE.md) - Guia completo com specs detalhadas
- [CLAUDE.md](./CLAUDE.md) - Agent development directives

## Comandos Úteis

```bash
# Backend
cd backend && uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev

# Specs
behave specs/                          # Todas as specs
behave specs/system/                   # System specs apenas
behave specs/ --tags=analyst           # Specs de analyst
behave specs/features/authentication.feature  # Feature específica

# Database (via Supabase MCP)
# Execute: backend/migrations/001_initial_schema.sql
```

## Licença

Private - Internal Use
