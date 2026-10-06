// release-check verify <version>: verify the version CI staged on npm.

import * as EitherAsync from '../../../src/EitherAsync.js';
import { pipe } from '../../../src/Function.js';
import { readPackageName, verifyStaged, type ReleaseDeps, type StagedReport } from '../../lib/release.js';

import { validateVersion } from './args.js';

export type VerifyOptions = { readonly version: string; readonly root: string };

export const handleVerify =
  (deps: ReleaseDeps) =>
  (opts: VerifyOptions): EitherAsync.EitherAsync<string, StagedReport> =>
    pipe(
      EitherAsync.liftEither(validateVersion(opts.version)),
      EitherAsync.chain(() => readPackageName(deps)(opts.root)),
      EitherAsync.chain((name: string) => verifyStaged(deps)(name, opts.version))
    );
