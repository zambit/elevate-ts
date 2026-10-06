// release-check smoke [tarball]: smoke-test a given tarball, or pack the current build first.

import * as EitherAsync from '../../../src/EitherAsync.js';
import { pipe } from '../../../src/Function.js';
import { packAndSmoke, readPackageName, smokeTarball, type ReleaseDeps } from '../../lib/release.js';
import type { SmokeReport } from '../../lib/smoke.js';

import { validateTarball } from './args.js';

export type SmokeOptions = { readonly tarball?: string; readonly root: string };

export const handleSmoke =
  (deps: ReleaseDeps) =>
  (opts: SmokeOptions): EitherAsync.EitherAsync<string, SmokeReport> =>
    opts.tarball === undefined
      ? pipe(
          readPackageName(deps)(opts.root),
          EitherAsync.chain((name: string) => packAndSmoke(deps)(opts.root, name))
        )
      : EitherAsync.chain(smokeTarball(deps))(EitherAsync.liftEither(validateTarball(deps.exists)(opts.tarball)));
