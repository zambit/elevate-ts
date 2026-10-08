// pnpm release-check <command>
//
// Release checks for @zambit/elevate-ts: smoke-test a package tarball, verify a
// version staged on npm, walk a human through the release review, and build or
// publish the commercial flavor to GitHub Packages.
// Wires commands only; logic lives in handlers/ and ../lib/. See docs/TOOLING.md.

import { readFileSync } from 'node:fs';

import { Command } from 'commander';

import { registerCheck } from './commands/check.js';
import { registerPublishCommercial } from './commands/publish-commercial.js';
import { registerReview } from './commands/review.js';
import { registerSmoke } from './commands/smoke.js';
import { registerVerify } from './commands/verify.js';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

const program = new Command().name('release-check').description('Smoke-test, verify and review @zambit/elevate-ts release tarballs').version(version).showHelpAfterError();

registerCheck(program);
registerSmoke(program);
registerVerify(program);
registerReview(program);
registerPublishCommercial(program);

await program.parseAsync();
