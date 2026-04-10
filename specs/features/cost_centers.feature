Feature: Cost Centers Management
  As an analyst or admin
  I want to manage cost centers
  So that operational costs can be categorized

  Background:
    Given I am logged in

  @analyst @admin
  Scenario: Create cost center
    Given I am on the "New Cost Center" page
    When I fill in the cost center form:
      | code        | INF              |
      | name        | Infrastructure   |
      | description | Server and hosting costs |
    And I click "Save"
    Then the cost center is created successfully
    And I see the cost center in the list
    And the cost center is active

  @analyst @admin @viewer
  Scenario: View cost centers list
    Given cost centers exist in the system
    When I navigate to "Cost Centers" page
    Then I see a list of all active cost centers
    And each cost center shows: code, name, description

  @analyst @admin
  Scenario: Update cost center
    Given a cost center exists with code "INF"
    And I am on the cost center detail page
    When I click "Edit"
    And I change the name to "Infrastructure & Hosting"
    And I click "Save"
    Then the cost center is updated
    And the name shows "Infrastructure & Hosting"

  @admin
  Scenario: Deactivate cost center
    Given a cost center exists with code "INF"
    When I click "Deactivate"
    And I confirm the deactivation
    Then the cost center is marked as inactive
    And it no longer appears in the active list

  @viewer
  Scenario: Viewer cannot create cost centers
    Given I am logged in as "viewer"
    When I navigate to the cost centers page
    Then I do not see a "New Cost Center" button
    And I cannot access the creation page directly
