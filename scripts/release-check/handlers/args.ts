// Argument validation shared by the release-check handlers. Pure.

import * as Either from '../../../src/Either.js';

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** A version argument must be semver, e.g. 0.9.0 or 1.0.0-beta.1. */
export const validateVersion = (version: string): Either.Either<string, string> =>
  SEMVER.test(version) ? Either.Right(version) : Either.Left(`Not a version: "${version}" (expected semver, for example 0.9.0)`);

/** A tarball argument must name an existing .tgz file. */
export const validateTarball =
  (exists: (file: string) => boolean) =>
  (tarball: string): Either.Either<string, string> =>
    !tarball.endsWith('.tgz') ? Either.Left(`Not a tarball: "${tarball}" (expected a .tgz file)`) : exists(tarball) ? Either.Right(tarball) : Either.Left(`No such file: ${tarball}`);
