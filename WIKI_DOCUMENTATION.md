# Sistema de Acompanhamento de Custos — Documentação de Uso e Regras

## Visão Geral

O **Sistema de Acompanhamento de Custos** é uma aplicação web para gerenciamento de custos operacionais mensais da equipe de controladoria. O sistema digitaliza o fluxo de trabalho anteriormente realizado em planilhas Excel, permitindo cadastro de empresas, registro de custos mensais por produto, exportação de dados, importação de planilhas e visualização de indicadores.

**Versão:** 0.1.0
**Status:** Production Ready
**Metodologia:** SDD (Spec-Driven Development) com Gherkin/Behave

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Frontend | React 18 + TypeScript + Vite |
| Banco de Dados | Supabase (PostgreSQL) com Row Level Security (RLS) |
| Autenticação | Supabase Auth |
| Estilização | Tailwind CSS |
| Validação | Gherkin + Behave (47/47 specs passando) |

---

## Domínio de Negócio

O sistema gerencia custos operacionais de benefícios corporativos para empresas clientes. Os produtos cobertos são:

| Produto | Descrição |
|---|---|
| **Gympass** | Plataforma de bem-estar corporativo |
| **Totalpass** | Plataforma de bem-estar corporativo |
| **Wiipo** | Plataforma de benefícios |
| **Flex** | Sistema de cartão flexível |

Cada registro mensal representa **1 empresa + 1 produto + 1 mês**, contendo dados de elegíveis, vidas cobradas, valores faturados e métricas financeiras.

---

## Regras de Negócio

### 1. Controle de Acesso por Roles

O sistema possui três níveis de permissão:

| Permissão | Viewer | Analyst | Admin |
|---|---|---|---|
| Visualizar dados | ✅ | ✅ | ✅ |
| Criar empresas | ❌ | ✅ | ✅ |
| Editar empresas | ❌ | ✅ | ✅ |
| Desativar empresas | ❌ | ✅ | ✅ |
| Excluir empresas | ❌ | ❌ | ✅ |
| Criar registros mensais | ❌ | ✅ | ✅ |
| Editar registros mensais | ❌ | ✅ | ✅ |
| Excluir registros mensais | ❌ | ❌ | ✅ |
| Exportar dados | ✅ | ✅ | ✅ |
| Importar planilhas | ❌ | ✅ | ✅ |
| Ver dashboard | ✅ | ✅ | ✅ |
| Ver logs de auditoria | ❌ | ❌ | ✅ |

**Hierarquia de roles:**
- `admin` — Acesso total. Pode excluir registros e visualizar auditoria.
- `analyst` — Pode criar, editar e desativar, mas não excluir permanentemente.
- `viewer` — Somente leitura. Não pode criar, editar ou excluir.

### 2. Companies (Empresas)

#### Campos Obrigatórios

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `company_id` | String (50 chars) | ✅ | Identificador interno único |
| `empresa` | String (255 chars) | ✅ | Nome fantasia da empresa |
| `cnpj` | String (18 chars) | ✅ | CNPJ formatado (XX.XXX.XXX/XXXX-XX) |

#### Campos Opcionais

| Campo | Tipo | Descrição |
|---|---|---|
| `razao_social` | String (255 chars) | Razão Social completa |
| `cliente` | String (255 chars) | Nome do contato/cliente |
| `email_envio` | String (255 chars) | E-mail para envio de documentos |
| `inicio_cobranca` | Date | Data de início da cobrança |
| `vencimento` | Integer (1-31) | Dia de vencimento do boleto |
| `nota_fiscal_descricao` | Text | Descrição que aparece na Nota Fiscal |
| `is_active` | Boolean | Status ativo/inativo (padrão: true) |

#### Regras

1. **`company_id` deve ser único** — Não é possível criar duas empresas com o mesmo identificador.
2. **`cnpj` deve ser único** — Não é possível criar duas empresas com o mesmo CNPJ.
3. **Desativação vs Exclusão:**
   - Desativar (`deactivate`) marca a empresa como inativa, mas preserva todos os registros mensais associados.
   - Excluir (`delete`) remove permanentemente a empresa e todos os seus registros mensais (cascade).
   - Apenas Admin pode excluir. Analyst pode desativar.
4. **Empresas inativas** só são visíveis por Admin no listagem padrão (filtro `active_only=true` por padrão).
5. **Ao desativar uma empresa**, seus registros mensais são preservados para histórico e auditoria.

### 3. Monthly Records (Registros Mensais)

#### Estrutura

Cada registro pertence a uma empresa e representa os custos de **um produto em um mês específico**.

##### Campos de Período e Produto

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `company_id` | UUID | ✅ | Referência à empresa |
| `mes_ano` | Date | ✅ | Primeiro dia do mês (ex: `2026-01-01`) |
| `produto` | String (100 chars) | ✅ | Gympass, Totalpass, Wiipo ou Flex |

##### Campos — Elegíveis

| Campo | Tipo | Descrição |
|---|---|---|
| `elegiveis_contrato` | Numeric(15,4) | Quantidade de elegíveis conforme contrato |
| `elegiveis` | Numeric(15,4) | Quantidade real de elegíveis |
| `valor_elegivel` | Decimal(15,2) | Valor por elegível |
| `valor_final` | Decimal(15,2) | Valor final calculado |
| `elegiveis_totalpass_gympass` | Numeric(15,4) | Elegíveis combinados Totalpass/Gympass |

##### Campos — Gympass/Totalpass

| Campo | Tipo | Descrição |
|---|---|---|
| `vidas_cobradas` | Numeric(15,4) | Quantidade de vidas cobradas |
| `nr_vidas` | Numeric(15,4) | Número de vidas |
| `valor_vidas` | Decimal(15,2) | Valor total das vidas |

##### Campos — Flex

| Campo | Tipo | Descrição |
|---|---|---|
| `nr_cartao_contrato_flex` | Numeric(15,4) | Nº de cartões contrato com Flex |
| `nr_cartao_carga_flex` | Numeric(15,4) | Nº de cartões com carga Flex |
| `rs_carregado` | Decimal(15,2) | R$ carregado nos cartões |
| `media_cartao_realizado` | Decimal(15,2) | Média por cartão realizado (base contrato Premium) |
| `media_contratada` | Decimal(15,2) | Média contratada |

##### Campos — Wiipo

| Campo | Tipo | Descrição |
|---|---|---|
| `valor_elegivel_wiipo` | Decimal(15,2) | Valor por elegível Wiipo |
| `faturamento_wiipo` | Decimal(15,2) | Faturamento Wiipo |

##### Campos — Financeiro

| Campo | Tipo | Descrição |
|---|---|---|
| `mensal_x_rentabilidade` | String (100 chars) | Relação mensal x rentabilidade |
| `custo_por_cliente` | Decimal(15,2) | Custo por cliente |
| `valor_faturado` | Decimal(15,2) | Valor faturado |
| `faturamento` | Decimal(15,2) | Faturamento total |

#### Regras

1. **Unicidade por empresa + produto + mês** — Não é possível criar dois registros com a mesma combinação de `company_id`, `produto` e `mes_ano`. Tentativa resulta em erro: *"Já existe um registro para este mês"*.
2. **Propagação automática** — Ao criar ou editar um registro mensal, os valores são automaticamente propagados para os meses futuros de 2026 da mesma empresa e produto. O parâmetro `propagate` (default: `true`) controla este comportamento.
3. **Propagação na exclusão** — Ao excluir um registro, todos os registros futuros propagados da mesma empresa e produto também são excluídos (quando `propagate=true`).
4. **Integridade referencial** — Ao excluir uma empresa, todos os seus registros mensais são excluídos em cascade.
5. **Mes_ano formato** — Sempre o primeiro dia do mês (ex: Janeiro/2026 = `2026-01-01`).

### 4. Propagação Automática

A propagação automática replica registros para meses futuros do mesmo ano (2026):

- **Ao criar:** Se um registro é criado para `2026-01-01`, registros idênticos são criados para `2026-02-01` até `2026-12-01` (para a mesma empresa e produto), caso ainda não existam.
- **Ao editar:** As alterações são replicadas para todos os meses futuros. Se o registro futuro não existe, é criado. Se já existe, é atualizado.
- **Ao excluir:** O registro e todos os registros futuros propagados são excluídos.
- **Controle:** O parâmetro query `?propagate=false` desativa a propagação em qualquer operação.

### 5. Importação de Planilhas Excel

#### Formato Esperado

- **Arquivo:** `.xlsx` ou `.xls`
- **Cabeçalho:** Os nomes das colunas estão na **linha 8** da planilha.
- **Abas (sheets):** Cada aba representa um mês. O mês é detectado pelo nome da aba.

#### Detecção de Mês pelo Nome da Aba

O sistema reconhece os seguintes formatos:

| Formato | Exemplo | Mês Detectado |
|---|---|---|
| `YYYY-MM` | `2026-01` | Janeiro/2026 |
| `MM/YYYY` | `01/2026` | Janeiro/2026 |
| Mês por extenso + ano | `Janeiro 2026` | Janeiro/2026 |
| Mês abreviado + ano | `jan/2026`, `fev2026` | Janeiro/2026, Fevereiro/2026 |

Meses suportados em português: janeiro, fevereiro, março, abril, maio, junho, julho, agosto, setembro, outubro, novembro, dezembro (e abreviações: jan, fev, mar, abr, mai, jun, jul, ago, set, out, nov, dez).

#### Fluxo de Importação

1. **Upload:** O arquivo Excel é enviado e armazenado temporariamente no Supabase Storage.
2. **Análise:** O sistema lê os metadados de cada aba (colunas detectadas, preview de 3 linhas, mês detectado).
3. **Mapeamento:** O usuário mapeia as colunas da planilha para os campos do sistema. Colunas podem ser ignoradas com `_skip`.
4. **Processamento:** Os dados são inseridos/atualizados no banco:
   - Empresas novas são criadas.
   - Empresas existentes (por CNPJ) são atualizadas.
   - Registros mensais são criados ou atualizados.
5. **Propagação opcional:** Se ativada, os registros do mês selecionado são propagados para meses futuros.

#### Tratamento de Dados

- **CNPJ:** Se o Excel remover zeros à esquerda (ex: `01234567000190` virar `1234567000190`), o sistema repõe para 14 dígitos.
- **Moeda:** Valores como `R$ 3.048,89` são convertidos para `3048.89`.
- **Datas:** `dd/mm/yyyy` são convertidos para `YYYY-MM-DD`.
- **Valores vazios:** Células vazias, `-`, `None`, `nan` são tratadas como `null`.
- **Empresa fallback:** Se `empresa` estiver vazio, usa `razao_social` ou `cliente`.

#### Erros Comuns

| Erro | Causa | Solução |
|---|---|---|
| "CNPJ já cadastrado" | Empresa com mesmo CNPJ já existe | A empresa existente será atualizada automaticamente |
| "Company ID já cadastrado" | `company_id` duplicado | O sistema tenta usar o CNPJ como identificador alternativo |
| "Campo obrigatório vazio" | Coluna essencial não mapeada | Verifique o mapeamento de colunas CNPJ e Empresa |
| "Linha ignorada: CNPJ ausente" | CNPJ não foi mapeado ou está vazio | Mapeie a coluna CNPJ na planilha |

### 6. Exportação CSV

- **Endpoint:** `GET /api/v1/export/monthly`
- **Filtro:** Parâmetro opcional `?mes_ano=YYYY-MM-DD`
- **Formato:** CSV com cabeçalhos em português
- **Conteúdo:** Todos os registros mensais com nome da empresa, mês/ano e todos os campos de custo
- **Mês no CSV:** Formato `MM/YYYY` (ex: `01/2026`)
- **Valores nulos:** Exportados como células vazias

### 7. Dashboard e KPIs

O dashboard exibe indicadores agregados por mês:

| KPI | Descrição |
|---|---|
| `total_empresas_ativas` | Quantidade de empresas ativas |
| `total_empresas_inativas` | Quantidade de empresas inativas |
| `total_registros` | Quantidade de registros mensais no período |
| `total_elegiveis_totalpass_gympass` | Soma de elegíveis Totalpass/Gympass |
| `total_nr_vidas` | Soma de vidas cobradas |
| `total_valor_vidas` | Soma do valor das vidas (R$) |
| `total_custo_por_cliente` | Soma do custo por cliente (R$) |
| `total_valor_faturado` | Soma do valor faturado (R$) |

**Filtro por mês:** Parâmetro opcional `?mes_ano=YYYY-MM-DD`. Sem filtro, agrega todos os registros.

### 8. Audit Log

O sistema registra automaticamente todas as operações de INSERT, UPDATE e DELETE nas tabelas `companies` e `monthly_records`.

#### Dados Registrados

| Campo | Descrição |
|---|---|
| `table_name` | Tabela afetada (`companies`, `monthly_records`, `profiles`, etc.) |
| `record_id` | ID do registro alterado |
| `action` | Tipo de operação: `INSERT`, `UPDATE` ou `DELETE` |
| `old_values` | Valores anteriores (JSON) — presente em UPDATE e DELETE |
| `new_values` | Novos valores (JSON) — presente em INSERT e UPDATE |
| `changed_by` | ID do usuário que realizou a operação |
| `changed_at` | Timestamp da operação |

#### Acesso

- **Apenas Admin** pode visualizar logs de auditoria.
- **Filtros disponíveis:** por tabela, por usuário, por tipo de ação.
- **Paginação:** `limit` (1-1000, padrão 100) e `offset` (padrão 0).

---

## API Reference

### Base URL

```
https://<backend-url>/api/v1
```

### Health Check

```
GET /health          → {"status": "ok"}
GET /                → {"message": "Sistema de Acompanhamento de Custos API", "version": "0.1.0"}
```

### Companies

| Método | Endpoint | Descrição | Role Mínima |
|---|---|---|---|
| `GET` | `/companies` | Listar empresas (filtro: `?active_only=true/false`) | Viewer |
| `GET` | `/companies/{id}` | Detalhes de uma empresa | Viewer |
| `GET` | `/companies/{id}/monthly` | Registros mensais da empresa (filtro: `?mes_ano=`) | Viewer |
| `POST` | `/companies` | Criar empresa | Analyst |
| `PUT` | `/companies/{id}` | Atualizar empresa | Analyst |
| `POST` | `/companies/{id}/deactivate` | Desativar empresa | Analyst |
| `DELETE` | `/companies/{id}` | Excluir empresa (e registros em cascade) | Admin |

### Monthly Records

| Método | Endpoint | Descrição | Role Mínima |
|---|---|---|---|
| `GET` | `/monthly` | Listar registros (filtros: `?company_id=`, `?mes_ano=`) | Viewer |
| `GET` | `/monthly/{id}` | Detalhes de um registro | Viewer |
| `POST` | `/monthly` | Criar registro (propagação: `?propagate=true/false`) | Analyst |
| `PUT` | `/monthly/{id}` | Atualizar registro (propagação: `?propagate=true/false`) | Analyst |
| `DELETE` | `/monthly/{id}` | Excluir registro (propagação: `?propagate=true/false`) | Admin |

### Dashboard

| Método | Endpoint | Descrição | Role Mínima |
|---|---|---|---|
| `GET` | `/dashboard` | KPIs agregados (filtro: `?mes_ano=`) | Viewer |

### Export

| Método | Endpoint | Descrição | Role Mínima |
|---|---|---|---|
| `GET` | `/export/monthly` | Exportar CSV (filtro: `?mes_ano=`) | Viewer |

### Import

| Método | Endpoint | Descrição | Role Mínima |
|---|---|---|---|
| `POST` | `/import/upload` | Upload de arquivo Excel (.xlsx, .xls) | Analyst |
| `POST` | `/import/process` | Processar importação com mapeamento de colunas | Analyst |

### Audit Logs

| Método | Endpoint | Descrição | Role Mínima |
|---|---|---|---|
| `GET` | `/audit-logs` | Listar logs (filtros: `?table_name=`, `?user_id=`, `?action=`, `?limit=`, `?offset=`) | Admin |
| `GET` | `/audit-logs/{id}` | Detalhes de um log | Admin |

---

## Banco de Dados

### Tabelas

| Tabela | Descrição |
|---|---|
| `profiles` | Perfis de usuários vinculados ao Supabase Auth |
| `companies` | Cadastro de empresas/clientes |
| `monthly_records` | Registros mensais de custos por produto |
| `audit_logs` | Logs de auditoria (preenchido automaticamente por triggers) |

### Row Level Security (RLS)

Todas as tabelas possuem RLS ativado. As políticas garantem que:

- **Viewers** só podem ler dados (SELECT).
- **Analysts** podem ler, criar e atualizar (SELECT, INSERT, UPDATE).
- **Admins** têm acesso completo (SELECT, INSERT, UPDATE, DELETE).
- **Audit logs** são visíveis apenas por Admins.

A verificação de role é feita pela função `has_role()` no banco de dados, que considera a hierarquia: `admin` > `analyst` > `viewer`.

### Migrations

| Arquivo | Descrição |
|---|---|
| `001_initial_schema.sql` | Tabelas base, funções RLS, triggers de auditoria |
| `002_companies_monthly_records.sql` | Tabelas `companies` e `monthly_records` com RLS e índices |
| `003_monthly_records_numeric_columns.sql` | Alteração de colunas INTEGER para NUMERIC(15,4) em campos quantitativos |

---

## Perfis de Usuário

### Viewer

**Perfil:** Membros da equipe que precisam consultar dados mas não alterá-los.

**Capacidades:**
- Visualizar lista de empresas e seus detalhes
- Visualizar registros mensais
- Visualizar dashboard com KPIs
- Exportar dados em CSV

**Restrições:**
- Não pode criar, editar ou excluir empresas
- Não pode criar, editar ou excluir registros mensais
- Não pode importar planilhas
- Não pode visualizar logs de auditoria

### Analyst

**Perfil:** Membros da controladoria que operam o dia a dia do sistema.

**Capacidades:**
- Tudo que o Viewer pode fazer
- Criar novas empresas
- Editar empresas existentes
- Desativar empresas
- Criar registros mensais
- Editar registros mensais
- Importar planilhas Excel

**Restrições:**
- Não pode excluir permanentemente empresas ou registros
- Não pode visualizar logs de auditoria

### Admin

**Perfil:** Administradores do sistema.

**Capacidades:**
- Tudo que o Analyst pode fazer
- Excluir empresas permanentemente
- Excluir registros mensais permanentemente
- Visualizar logs de auditoria

---

## Fluxos de Uso

### Fluxo 1: Cadastrar Nova Empresa

1. Fazer login como Analyst ou Admin.
2. Navegar para a página de Empresas.
3. Clicar em "Nova Empresa".
4. Preencher os campos obrigatórios: `company_id`, `empresa`, `cnpj`.
5. Preencher campos opcionais conforme necessário.
6. Clicar em "Salvar".
7. A empresa aparece na lista de empresas ativas.

### Fluxo 2: Adicionar Registro Mensal

1. Selecionar uma empresa na lista.
2. Selecionar o mês e ano desejado.
3. Clicar em "Novo Registro" para o produto desejado (Gympass, Totalpass, Wiipo ou Flex).
4. Preencher os campos de custos e métricas.
5. Clicar em "Salvar".
6. O registro é criado e propagado automaticamente para os meses futuros de 2026.

### Fluxo 3: Importar Planilha

1. Fazer login como Analyst ou Admin.
2. Clicar em "Importar Planilha".
3. Selecionar o arquivo Excel (.xlsx ou .xls).
4. O sistema exibe as abas detectadas com os meses e colunas.
5. Para cada aba, confirmar ou ajustar o mês detectado e marcar quais abas incluir.
6. Mapear as colunas da planilha para os campos do sistema.
7. Opcionalmente ativar a propagação para meses futuros.
8. Clicar em "Processar Importação".
9. O sistema exibe o resundo: empresas criadas, empresas atualizadas, registros criados, registros atualizados e erros.

### Fluxo 4: Exportar Dados

1. Navegar para a página de registros mensais ou dashboard.
2. Clicar em "Exportar CSV".
3. Opcionalmente filtrar por mês.
4. O arquivo CSV é baixado automaticamente.

### Fluxo 5: Consultar Log de Auditoria

1. Fazer login como Admin.
2. Navegar para a página de Audit Log.
3. Opcionalmente filtrar por tabela, usuário ou tipo de ação.
4. Visualizar as entradas com data/hora, ação, valores anteriores e novos.

---

## Validações e Restrições

| Regra | Validação |
|---|---|
| CNPJ único | Erro 400: "CNPJ already exists" |
| Company ID único | Erro 400: "Company ID already exists" |
| Registro duplicado (empresa + produto + mês) | Erro 400: "Já existe um registro para este mês" |
| Empresa não encontrada | Erro 404: "Company not found" |
| Registro não encontrado | Erro 404: "Monthly record not found" |
| Arquivo de import inválido | Erro 400: "Apenas arquivos Excel (.xlsx, .xls) são aceitos" |
| CNPJ ausente na importação | Erro: "Linha ignorada: CNPJ ausente" |
| Empresa ausente na importação | Erro: "Linha ignorada: campo 'Empresa' vazio" |
| `vencimento` fora do intervalo | Deve ser entre 1 e 31 |
| `amount` negativo ou zero | Rejeitado pelo CHECK constraint do banco |

---

## Códigos de Erro do Banco de Dados

| Código SQL | Significado | Mensagem Amigável |
|---|---|---|
| `23505` | Unique violation | "Registro duplicado — verifique se a empresa já está cadastrada" |
| `23502` | Not null violation | "Campo obrigatório está vazio na planilha" |
| `22001` | String data right truncation | "Valor muito longo em algum campo" |

---

## Comandos Úteis

### Executar Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### Executar Frontend

```bash
cd frontend
npm run dev
```

### Executar Specs (Validação)

```bash
behave specs/                          # Todas as specs
behave specs/system/                   # Specs de sistema
behave specs/features/companies.feature  # Feature específica
behave specs/ --tags=analyst           # Specs por role
```

### Aplicar Migrations no Supabase

1. Acessar Supabase Dashboard → SQL Editor.
2. Executar em ordem:
   - `backend/migrations/001_initial_schema.sql`
   - `backend/migrations/002_companies_monthly_records.sql`
   - `backend/migrations/003_monthly_records_numeric_columns.sql`

---

## Variáveis de Ambiente

### Backend

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave pública/anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (server-side only) |
| `DATABASE_URL` | String de conexão PostgreSQL |
| `SECRET_KEY` | Chave secreta para autenticação |
| `API_V1_STR` | Prefixo da API (padrão: `/api/v1`) |
| `ALLOWED_ORIGINS` | Origens permitidas para CORS (separadas por vírgula) |

### Frontend

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública/anon do Supabase |
| `VITE_API_BASE_URL` | URL do backend + `/api/v1` |

---

## Glossário

| Termo | Definição |
|---|---|
| **Empresa** | Cliente/organização cujos custos são gerenciados |
| **Registro Mensal** | Dados de custos de uma empresa + produto + mês |
| **Elegíveis** | Pessoas elegíveis para os benefícios |
| **Vidas Cobradas** | Quantidade de pessoas efetivamente cobradas |
| **Propagação** | Replicação automática de registros para meses futuros |
| **RLS** | Row Level Security — segurança a nível de linha no PostgreSQL |
| **Profile** | Perfil de usuário vinculado ao Supabase Auth |
| **Audit Log** | Registro automático de todas as alterações no sistema |
| **SDD** | Spec-Driven Development — metodologia baseada em specs executáveis Gherkin |
| **CNPJ** | Cadastro Nacional da Pessoa Jurídica (identificador brasileiro de empresas) |
