// release-check review <tarball>: validate arguments for the guided review.
// The review itself is interactive and run by the command layer.

import * as Either from '../../../src/Either.js';

import { validateTarball } from './args.js';

export type ReviewArgs = { readonly tarball: string; readonly out?: string };

export const handleReviewArgs =
  (exists: (file: string) => boolean) =>
  (args: ReviewArgs): Either.Either<string, ReviewArgs> =>
    Either.map<string, string, ReviewArgs>((tarball) => ({ ...args, tarball }))(validateTarball(exists)(args.tarball));
