import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Command } from 'commander';

import { reviewTarball } from '../../lib/review-command.js';
import { handleReviewArgs } from '../handlers/review.js';

import { fail } from './output.js';

export const registerReview = (program: Command): void => {
  program
    .command('review')
    .description('Walk through the human release checks for a tarball and write a review record. Prints the approve or reject command; never runs it.')
    .argument('<tarball>', 'the .tgz to review')
    .option('--out <file>', 'where to write the review record (default reviews/releases/<version>.md)')
    .action(async (tarball: string, opts: { out?: string }) => {
      const args = handleReviewArgs(existsSync)({ tarball: resolve(tarball), out: opts.out === undefined ? undefined : resolve(opts.out) });
      if (args.tag === 'Left') return fail(args.left);
      process.exitCode = await reviewTarball(args.right.tarball, process.cwd(), { out: args.right.out });
    });
};
