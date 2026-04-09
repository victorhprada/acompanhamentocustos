Feature: Monthly Cost Records
  As an analyst
  I want to enter monthly cost data per product
  So that the controller team can track expenses month by month

  Background:
    Given the API is running
    And I am logged in

  @analyst @admin
  Scenario: Add monthly record for a product
    Given company "EMP001" exists
    When I add a monthly record:
      | field          | value      |
      | mes_ano        | 2026-01-01 |
      | produto        | Gympass    |
      | elegiveis      | 100        |
      | vidas_cobradas | 95         |
      | valor_final    | 15000.00   |
    And I save the monthly record
    Then the monthly record is created successfully
    And the monthly API returns status 201

  @analyst @admin
  Scenario: Duplicate month detection
    Given company "EMP-DUP" exists
    And a monthly record for "EMP-DUP" + "Gympass" + "2026-01-01"
    When I try to add another record for the same company + product + month
    And I save the monthly record
    Then I see a monthly validation error "Record already exists for this month and product"

  @analyst @admin
  Scenario: Add multiple products for same month
    Given company "EMP001" exists
    When I add a monthly record:
      | field       | value      |
      | mes_ano     | 2026-02-01 |
      | produto     | Gympass    |
      | valor_final | 15000.00   |
    And I save the monthly record
    And I add another monthly record:
      | field       | value     |
      | mes_ano     | 2026-02-01 |
      | produto     | Wiipo     |
      | valor_final | 3000.00   |
    And I save the monthly record
    Then both records are created
    And I can retrieve both for the same month

  @analyst @admin @viewer
  Scenario: View monthly records for a company
    Given company "EMP001" has monthly records
    When I retrieve monthly records for company "EMP001"
    Then I see all monthly records for that company
    And each record shows: mes_ano, produto, valor_final

  @analyst @admin @viewer
  Scenario: View records filtered by month
    Given monthly records exist for "2026-01-01" and "2026-02-01"
    When I filter records by month "2026-01-01"
    Then I see only records from January 2026
    And I do not see February records

  @analyst @admin @viewer
  Scenario: View all records across companies
    Given monthly records exist for multiple companies
    When I retrieve all monthly records
    Then I see records from all companies
    And I can filter by company_id

  @analyst @admin
  Scenario: Update a monthly record
    Given a monthly record exists for "EMP001" + "Gympass" + "2026-01-01"
    When I update the record:
      | field       | value    |
      | valor_final | 16000.00 |
    And I save the update
    Then the monthly record is updated
    And the valor_final shows 16000.00

  @admin
  Scenario: Delete a monthly record
    Given a monthly record exists for "EMP001" + "Gympass" + "2026-01-01"
    When I delete the monthly record
    Then the record is permanently removed
    And I get 404 when retrieving it

  @viewer
  Scenario: Viewer cannot create monthly records
    Given I am logged in as "viewer"
    When I try to create a monthly record
    Then the monthly operation is denied

  @viewer
  Scenario: Viewer cannot edit monthly records
    Given a monthly record exists
    And I am logged in as "viewer"
    When I try to update the monthly record
    Then the monthly operation is denied

  @viewer
  Scenario: Viewer cannot delete monthly records
    Given a monthly record exists
    And I am logged in as "viewer"
    When I try to delete the monthly record
    Then the monthly operation is denied
