Feature: release-check smoke
  Installs a tarball into a throwaway project and loads every subpath export

  Scenario: Smoke-test the current build
    Given the package has been built
    When the user runs "release-check smoke"
    Then the package is packed with pnpm pack
    And every exports target is checked and every entry point loaded under ESM and CJS
    And the command exits 0

  Scenario: Smoke-test a given tarball
    When the user runs "release-check smoke pkg.tgz"
    Then that tarball is installed and checked without packing
    And the command exits 0

  Scenario: An entry point fails to load
    Given a tarball whose CJS build is missing
    When the user runs "release-check smoke pkg.tgz"
    Then the missing export targets are listed
    And the command exits 1
