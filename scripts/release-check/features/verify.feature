Feature: release-check verify
  Verifies a version that CI staged on npm, before it goes live

  Scenario: Staged version passes the automated checks
    Given CI has staged version 0.9.0
    And the user is logged in to npm
    When the user runs "release-check verify 0.9.0"
    Then the staged tarball is downloaded and its shasum matches the registry
    And the smoke test passes
    And the next step (review, then approve) is printed
    And the command exits 0

  Scenario: Verify and review in one go
    Given CI has staged version 0.9.0
    When the user runs "release-check verify 0.9.0 --review"
    Then the human review starts on the staged tarball after the automated checks pass

  Scenario: Nothing staged
    Given no staged entry exists for 0.9.0
    When the user runs "release-check verify 0.9.0"
    Then the command explains that CI may not have finished staging
    And the command exits 1

  Scenario: Not logged in
    Given the npm session has expired
    When the user runs "release-check verify 0.9.0"
    Then the command says to run npm login
    And the command exits 1

  Scenario: Invalid version
    When the user runs "release-check verify latest"
    Then the command exits with a usage error
