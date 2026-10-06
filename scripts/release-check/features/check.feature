Feature: release-check check
  Smoke-tests a package tarball, then walks the reviewer through the human checks

  Scenario: Tarball passes the smoke test and the review
    Given a tarball whose exports all ship and load under ESM and CJS
    When the user runs "release-check check pkg.tgz"
    And answers pass to every human check
    Then a review record is written
    And the npm stage approve command is printed if the tarball is staged
    And the command exits 0

  Scenario: Tarball fails the smoke test
    Given a tarball with an export target missing
    When the user runs "release-check check pkg.tgz"
    Then the smoke test failure is printed
    And the human review does not start
    And the command exits 1

  Scenario: A human check fails
    Given a tarball that passes the smoke test
    When the user runs "release-check check pkg.tgz"
    And answers fail to a human check with a note
    Then the review record shows the failure and the note
    And the npm stage reject command is printed if the tarball is staged
    And the command exits 1

  Scenario: Not a tarball
    When the user runs "release-check check notes.txt"
    Then the command exits with a usage error
