// release-check check <tarball>: the automated half (smoke test) of the full check.
// The guided human review that follows is interactive and run by the command layer.

import * as EitherAsync from '../../../src/EitherAsync.js';
import type { ReleaseDeps } from '../../lib/release.js';
import type { SmokeReport } from '../../lib/smoke.js';

import { handleSmoke } from './smoke.js';

export type CheckOptions = { readonly tarball: string; readonly root: string };

export const handleCheck =
  (deps: ReleaseDeps) =>
  (opts: CheckOptions): EitherAsync.EitherAsync<string, SmokeReport> =>
    handleSmoke(deps)({ tarball: opts.tarball, root: opts.root });
