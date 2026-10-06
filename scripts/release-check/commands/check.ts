import { resolve } from 'node:path';

import type { Command } from 'commander';

import { nodeReleaseDeps } from '../../lib/node-deps.js';
import { reviewTarball } from '../../lib/review-command.js';
import { handleCheck } from '../handlers/check.js';

import { fail, smokeLine } from './output.js';

export const registerCheck = (program: Command): void => {
  program
    .command('check')
    .description('Full check of a tarball: the smoke test, then the guided human review. Ends with the approve or reject command.')
    .argument('<tarball>', 'the .tgz to check, for example the one `verify` downloaded')
    .option('--out <file>', 'where to write the review record (default reviews/releases/<version>.md)')
    .action(async (tarball: string, opts: { out?: string }) => {
      const smoke = await handleCheck(nodeReleaseDeps)({ tarball: resolve(tarball), root: process.cwd() }).run();
      if (smoke.tag === 'Left') return fail(`${smoke.left}\nThe human review was not started.`);
      console.log(smokeLine(smoke.right));
      process.exitCode = await reviewTarball(resolve(tarball), process.cwd(), { out: opts.out === undefined ? undefined : resolve(opts.out) });
    });
};
