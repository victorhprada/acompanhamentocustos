Feature: Data Model
  As a database administrator
  I want a well-defined data model
  So that data integrity is maintained

  Scenario: Core tables exist
    Given the database is initialized
    Then table "profiles" exists
    And table "companies" exists
    And table "monthly_records" exists
    And table "audit_logs" exists

  Scenario: Company data has proper constraints
    Given a company is created
    Then the cnpj field is unique
    And the company_id field is unique
    And the is_active flag defaults to true

  Scenario: Monthly records have unique constraint
    Given a monthly record is created
    Then the combination of company_id + produto + mes_ano is unique
    And each record is linked to a valid company
    And financial fields use DECIMAL type

  Scenario: Financial data uses proper types
    Given a monthly record is created
    Then valor_final uses DECIMAL type
    And valor_elegivel uses DECIMAL type
    And rs_carregado uses DECIMAL type
    And amounts cannot be negative

  Scenario: Referential integrity is enforced
    Given a company is referenced by monthly records
    When the company is deleted
    Then all its monthly records are deleted (CASCADE)
    And no orphaned records exist
