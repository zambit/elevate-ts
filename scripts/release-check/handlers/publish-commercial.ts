// release-check publish-commercial [--publish]: build, smoke-test and (with --publish)
// publish the commercial flavor to GitHub Packages.

import type * as EitherAsync from '../../../src/EitherAsync.js';
import { publishCommercial, type CommercialReport } from '../../lib/commercial.js';
import type { ReleaseDeps } from '../../lib/release.js';

export type PublishCommercialOptions = { readonly root: string; readonly publish: boolean };

export const handlePublishCommercial =
  (deps: ReleaseDeps) =>
  (opts: PublishCommercialOptions): EitherAsync.EitherAsync<string, CommercialReport> =>
    publishCommercial(deps)(opts.root, opts.publish);
