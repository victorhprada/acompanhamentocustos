Feature: Security Model
  As a system architect
  I want robust security policies
  So that data is protected at all levels

  Scenario: RLS policies enforce role hierarchy
    Given the role hierarchy is: admin > analyst > viewer
    When a "viewer" attempts to create a cost
    Then the operation is denied
    When an "analyst" attempts to delete a cost
    Then the operation is denied
    When an "admin" performs any operation
    Then the operation is allowed

  Scenario: Unauthenticated request is rejected by the API
    Given an unauthenticated user
    When they attempt to access any protected resource
    Then they receive a 401 Unauthorized response

  Scenario: Audit trail captures all changes
    Given a cost is created, updated, or deleted
    Then an audit log entry is created
    And the log contains the old and new values
    And the log contains the user who made the change
