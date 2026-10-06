// In-memory fakes for the release scripts' side effects.

import * as EitherAsync from '../../src/EitherAsync.js';
import type { ReviewDeps } from '../../scripts/lib/review-session.js';

export type Call = { readonly cmd: string; readonly args: readonly string[]; readonly cwd: string };

export type FakeOptions = {
  /** Result per command line (`cmd args...`); unmatched commands succeed with ''. */
  readonly commands?: Readonly<Record<string, { ok: string } | { fail: string }>>;
  /** Files readable via readText. */
  readonly files?: Readonly<Record<string, string>>;
  /** Paths reported as existing; default: everything exists. */
  readonly existing?: (file: string) => boolean;
  readonly sha1?: string;
  readonly copyFails?: string;
};

export type Fake = { readonly deps: ReviewDeps; readonly calls: Call[]; readonly written: Map<string, string> };

export const fakeDeps = (opts: FakeOptions = {}): Fake => {
  const calls: Call[] = [];
  const written = new Map<string, string>();
  const run = (cmd: string, args: readonly string[], cwd: string): EitherAsync.EitherAsync<string, string> => {
    calls.push({ cmd, args, cwd });
    const r = opts.commands?.[[cmd, ...args].join(' ')];
    return r === undefined ? EitherAsync.right('') : 'ok' in r ? EitherAsync.right(r.ok) : EitherAsync.left(r.fail);
  };
  const deps: ReviewDeps = {
    run,
    writeText: (file, text) => (written.set(file, text), EitherAsync.right(undefined)),
    readText: (file) => (opts.files?.[file] !== undefined ? EitherAsync.right(opts.files[file]) : EitherAsync.left(`ENOENT ${file}`)),
    exists: opts.existing ?? (() => true),
    makeTempDir: () => EitherAsync.right('/tmp/work'),
    sha1File: () => EitherAsync.right(opts.sha1 ?? 'abc123'),
    copyProject: (from, to) => (calls.push({ cmd: 'copy', args: [from, to], cwd: '' }), opts.copyFails === undefined ? EitherAsync.right(undefined) : EitherAsync.left(opts.copyFails))
  };
  return { deps, calls, written };
};
