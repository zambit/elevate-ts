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

  Scenario: Real-code trial in a single project
    Given the reviewer gives the path to a project without a pnpm-workspace.yaml
    When the trial runs
    Then a temporary copy of the project runs "pnpm install", "pnpm add <tarball>" and "pnpm test"
    And the original project is not modified

  Scenario: Real-code trial in a pnpm workspace
    Given the reviewer gives the path to a project with a pnpm-workspace.yaml
    When the trial runs
    Then the copy's pnpm-workspace.yaml gets an override pointing the package at the tarball
    And the copy runs "pnpm install" and "pnpm -r --include-workspace-root test"

  Scenario: Workspace already has overrides
    Given the project's pnpm-workspace.yaml already has an overrides block
    When the trial runs
    Then the trial fails without running pnpm and tells the reviewer to run it by hand
