Feature: User Authentication
  As a registered user
  I want to authenticate securely
  So that I can access the system according to my role

  Background:
    Given the Supabase authentication is configured
    And the following users exist:
      | email                  | role     | full_name        |
      | admin@empresa.com      | admin    | Admin User       |
      | analyst@empresa.com    | analyst  | Analyst User     |
      | viewer@empresa.com     | viewer   | Viewer User      |

  Scenario: User logs in successfully
    Given I am on the login page
    When I enter valid credentials
    Then I am redirected to the dashboard
    And my role is displayed in the header

  Scenario: User logs in with invalid credentials
    Given I am on the login page
    When I enter invalid credentials
    Then I see an error message "Invalid email or password"
    And I remain on the login page

  Scenario: User session expires
    Given I am logged in
    When my session expires after inactivity
    Then I am redirected to the login page
    And I see a message "Session expired, please login again"

  Scenario: User profile loads after login
    Given I am logged in as "analyst@empresa.com"
    When I navigate to my profile
    Then I see my full name, email, and role
    And I can update my profile information
