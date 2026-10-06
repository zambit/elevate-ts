// pnpm review-tarball <tarball.tgz> [--out <file>]
//
// Walks a reviewer through the human release checks for a package tarball:
// dist-tag, file list (compared with the previous release), version and
// changelog, README changes, and an optional trial in a real project.
// Writes a review record (default reviews/releases/<version>.md) and prints the
// `npm stage approve` command if every check passed. It never approves.
//
// `pnpm verify-staged <version> --review` runs this automatically on the staged tarball.
// See docs/TESTING_STAGED_RELEASES.md.

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import * as Either from '../src/Either.js';

import { reviewTarball } from './lib/review-command.js';

const USAGE = 'Usage: pnpm review-tarball <tarball.tgz> [--out <file>]';

type Args = { readonly tarball: string; readonly out: string | undefined };

const parse = (argv: readonly string[]): Either.Either<string, Args> =>
  Either.chain(({ values, positionals }: { values: { out?: string }; positionals: string[] }) => {
    const tarball = positionals[0];
    return positionals.length === 1 && tarball !== undefined && tarball.endsWith('.tgz') && existsSync(tarball)
      ? Either.Right<Args>({ tarball: resolve(tarball), out: values.out === undefined ? undefined : resolve(values.out) })
      : Either.Left<string>(USAGE);
  })(
    Either.tryCatch(
      () => parseArgs({ args: [...argv], allowPositionals: true, options: { out: { type: 'string' } } }),
      (e) => `${(e as Error).message}\n${USAGE}`
    )
  );

const args = parse(process.argv.slice(2));
if (args.tag === 'Left') {
  console.error(args.left);
  process.exit(1);
}

process.exit(await reviewTarball(args.right.tarball, process.cwd(), { out: args.right.out }));
