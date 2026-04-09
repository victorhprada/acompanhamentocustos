Feature: System Overview
  As a controller team
  I want a monthly cost tracking system
  So that I can manage company benefits costs (Gympass, Wiipo, Flex) month by month

  Scenario: System provides company management
    Given the system is deployed
    Then users can register companies
    And users can view company details
    And users can deactivate companies

  Scenario: System provides monthly cost tracking
    Given the system is deployed
    Then users can enter monthly cost records per product
    And users can view costs month by month
    And users can filter by company and month
    And each month shows all products for that company

  Scenario: System enforces role-based access control
    Given a user is authenticated
    When the user has role "viewer"
    Then they can only view data
    When the user has role "analyst"
    Then they can create and update data
    When the user has role "admin"
    Then they can perform all operations including deletion

  Scenario: System maintains data security via RLS
    Given the database has Row Level Security enabled
    Then users can only access data according to their role
    And all data access is enforced at database level
