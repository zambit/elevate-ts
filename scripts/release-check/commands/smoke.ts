import { resolve } from 'node:path';

import type { Command } from 'commander';

import { nodeReleaseDeps } from '../../lib/node-deps.js';
import { handleSmoke } from '../handlers/smoke.js';

import { fail, smokeLine } from './output.js';

export const registerSmoke = (program: Command): void => {
  program
    .command('smoke')
    .description('Install a tarball into a throwaway project and load every subpath export under ESM and CJS. With no tarball, packs the current build first (run pnpm build before).')
    .argument('[tarball]', 'a .tgz to test instead of packing the current build')
    .action(async (tarball: string | undefined) => {
      const result = await handleSmoke(nodeReleaseDeps)({ tarball: tarball === undefined ? undefined : resolve(tarball), root: process.cwd() }).run();
      if (result.tag === 'Right') console.log(smokeLine(result.right));
      else fail(result.left);
    });
};
