import type { Command } from 'commander';

import { nodeReleaseDeps } from '../../lib/node-deps.js';
import { reviewTarball } from '../../lib/review-command.js';
import { handleVerify } from '../handlers/verify.js';

import { fail, stagedReport } from './output.js';

export const registerVerify = (program: Command): void => {
  program
    .command('verify')
    .description('Verify a version CI staged on npm: download the staged tarball, check its shasum against the registry, and smoke-test it. Requires npm login.')
    .argument('<version>', 'the staged version, for example 0.9.0')
    .option('--review', 'then run the guided human review on the staged tarball')
    .action(async (version: string, opts: { review?: boolean }) => {
      const review = opts.review === true;
      const result = await handleVerify(nodeReleaseDeps)({ version, root: process.cwd() }).run();
      if (result.tag === 'Left') return fail(result.left);
      console.log(stagedReport(result.right, review));
      if (review) process.exitCode = await reviewTarball(result.right.tarball, process.cwd(), { staged: result.right.item });
    });
};
