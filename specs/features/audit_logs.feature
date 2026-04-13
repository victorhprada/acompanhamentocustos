Feature: Audit Log
  As an administrator
  I want to view audit logs of all changes
  So that I can track who changed what and when

  Background:
    Given the API is running
    And I am logged in

  @admin
  Scenario: View audit logs
    When I retrieve the audit logs
    Then I see a list of audit log entries
    And each entry shows: table_name, action, changed_at

  @admin
  Scenario: Filter audit logs by table
    Given audit logs exist for multiple tables
    When I filter audit logs by table "companies"
    Then I see only audit logs for the companies table

  @admin
  Scenario: Filter audit logs by action
    When I filter audit logs by action "INSERT"
    Then I see only audit logs with INSERT action

  @admin
  Scenario: View audit log details
    Given an audit log entry exists
    When I retrieve the audit log detail
    Then I see the old and new values

  @viewer
  Scenario: Viewer cannot access audit logs
    Given I am logged in as "viewer"
    When I try to retrieve audit logs
    Then the audit operation is denied
