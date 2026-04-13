Feature: Reporting and Export
  As a controller team member
  I want to view dashboard KPIs and export data
  So that I can analyze costs and share reports

  Background:
    Given the API is running
    And I am logged in

  @analyst @admin @viewer
  Scenario: View dashboard KPIs
    When I retrieve the dashboard data
    Then I see total elegíveis totalpass/gympass
    And I see total nº vidas
    And I see total valor vidas
    And I see total custo por cliente
    And I see total valor faturado

  @analyst @admin @viewer
  Scenario: View dashboard filtered by month
    When I retrieve the dashboard for month "2026-01-01"
    Then I see KPIs for January 2026 only

  @analyst @admin @viewer
  Scenario: Export monthly records to CSV
    Given monthly records exist for "2026-01-01" and "2026-02-01"
    When I export records for month "2026-01-01"
    Then I receive a CSV file
    And the CSV contains the records for that month

  @analyst @admin @viewer
  Scenario: Export all monthly records
    Given monthly records exist for multiple companies
    When I export all records
    Then I receive a CSV file
    And the CSV contains all records
