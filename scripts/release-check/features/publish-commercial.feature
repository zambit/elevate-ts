Feature: release-check publish-commercial
  Builds the commercial flavor of the package and publishes it to GitHub Packages

  Background:
    Given the package has been built

  Scenario: Dry run by default
    When the user runs "release-check publish-commercial"
    Then the package is packed and unpacked in a temporary directory
    And the unpacked package.json is renamed to @zambit/elevate-ts-commercial with the GitHub Packages registry
    And the unpacked LICENSE is replaced with COMMERCIAL-LICENSE.md
    And the result is packed again and smoke-tested under ESM and CJS
    And the name, version, tarball and file count are printed
    And nothing is published
    And the working tree is not modified

  Scenario: Publish
    When the user runs "release-check publish-commercial --publish"
    Then the smoke-tested commercial tarball is published to https://npm.pkg.github.com
    And the command exits 0

  Scenario: Commercial license missing
    Given COMMERCIAL-LICENSE.md does not exist
    When the user runs "release-check publish-commercial"
    Then the command exits 1 with a message naming COMMERCIAL-LICENSE.md
    And nothing is published

  Scenario: Smoke test fails
    Given the rewritten package fails to load an entry point
    When the user runs "release-check publish-commercial --publish"
    Then the command exits 1
    And nothing is published
