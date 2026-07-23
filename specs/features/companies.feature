Feature: Companies Management
  As an analyst or admin
  I want to manage company registry data
  So that monthly cost records can be associated with companies

  Background:
    Given the API is running
    And I am logged in

  @analyst @admin
  Scenario: Register a new company
    Given I am on the "New Company" page
    When I fill in the company form:
      | field          | value              |
      | company_id     | EMP001             |
      | empresa        | Empresa Alpha      |
      | cnpj           | 98.765.432/0001-10 |
      | razao_social   | Alpha Ltda         |
      | cliente        | João Silva         |
      | email_envio    | joao@alpha.com     |
    And I save the company
    Then the company is created successfully
    And the API returns status 201
    And I see the company in the list

  @analyst @admin
  Scenario: Company requires mandatory fields
    Given I am on the "New Company" page
    When I leave "empresa" empty
    And I save the company
    Then I see a validation error "Empresa is required"
    And the company is not created

  @analyst @admin
  Scenario: Company CNPJ must be unique
    Given a company exists with CNPJ "12.345.678/0001-90"
    When I try to create another company with CNPJ "12.345.678/0001-90"
    And I save the company
    Then I see a validation error "CNPJ já cadastrado"
    And the company is not created

  @analyst @admin @viewer
  Scenario: View companies list
    Given companies exist in the system
    When I navigate to "Companies" page
    Then I see a list of all active companies
    And each company shows: company_id, empresa, cnpj, cliente

  @analyst @admin @viewer
  Scenario: View company details
    Given a company exists with company_id "EMP001"
    When I click on the company
    Then I see the full company details
    And I see all fields: empresa, cnpj, razao_social, cliente, email_envio

  @analyst @admin
  Scenario: Update company information
    Given a company exists with company_id "EMP001"
    And I am on the company detail page
    When I click "Edit Company"
    And I change the cliente to "Maria Santos"
    And I click "Update"
    Then the company is updated
    And the cliente shows "Maria Santos"

  @analyst @admin
  Scenario: Deactivate a company
    Given a company exists with company_id "EMP001"
    When I click "Deactivate Company"
    And I confirm company deactivation
    Then the company is marked as inactive
    And it no longer appears in the active companies list
    But its monthly records are preserved

  @admin
  Scenario: Delete a company
    Given a company exists with company_id "EMP003"
    When I click "Delete Company"
    And I confirm company deletion
    Then the company is permanently removed
    And all its monthly records are deleted (CASCADE)

  @viewer
  Scenario: Viewer cannot create companies
    Given I am logged in as "viewer"
    When I navigate to the companies page
    Then I do not see a "New Company" button
    And I cannot access the creation page directly

  @viewer
  Scenario: Viewer cannot edit companies
    Given a company exists
    And I am logged in as "viewer"
    When I view the company details
    Then I do not see an "Edit" button
    And I cannot access the edit page directly

  @viewer
  Scenario: Viewer cannot delete companies
    Given a company exists
    And I am logged in as "viewer"
    When I view the company details
    Then I do not see a "Delete" button
