import type { Command } from 'commander';

import { nodeReleaseDeps } from '../../lib/node-deps.js';
import { handlePublishCommercial } from '../handlers/publish-commercial.js';

import { commercialReport, fail } from './output.js';

export const registerPublishCommercial = (program: Command): void => {
  program
    .command('publish-commercial')
    .description('Build the commercial flavor (@zambit/elevate-ts-commercial) from the current build and smoke-test it. Publishes to GitHub Packages only with --publish (run pnpm build before).')
    .option('--publish', 'publish to GitHub Packages after the smoke test passes (CI does this after the commercial environment is approved)', false)
    .action(async (opts: { publish: boolean }) => {
      const result = await handlePublishCommercial(nodeReleaseDeps)({ root: process.cwd(), publish: opts.publish }).run();
      if (result.tag === 'Right') console.log(commercialReport(result.right));
      else fail(result.left);
    });
};
