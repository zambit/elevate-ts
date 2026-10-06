Feature: release-check review
  Guided human review of a tarball, with a review record

  Scenario: Review a staged tarball
    Given a tarball staged on npm
    When the user runs "release-check review pkg.tgz"
    Then each check shows its evidence and warnings and asks pass, fail or skip
    And a review record is written to reviews/releases/<version>.md
    And the approve or reject command is printed but never run

  Scenario: Custom record location
    When the user runs "release-check review pkg.tgz --out review.md"
    Then the review record is written to review.md

  Scenario: Input ends early
    When the reviewer's input closes before every check is answered
    Then no review record is written
    And the command exits 1
