// Real Node implementations of the side effects the release scripts need.
// Kept apart from the pure logic in stage.ts / smoke.ts so that logic stays testable.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import * as EitherAsync from '../../src/EitherAsync.js';

import type { ReleaseDeps } from './release.js';

const _execFile = promisify(execFile);

const _errorText = (cmd: string, args: readonly string[], e: unknown): string => {
  const err = e as { stderr?: string; stdout?: string; message?: string };
  const detail = (err.stderr ?? '').trim() || (err.stdout ?? '').trim() || (err.message ?? String(e));
  return `\`${[cmd, ...args].join(' ')}\` failed:\n${detail}`;
};

/** Run a command, resolving to its stdout. */
export const run = (cmd: string, args: readonly string[], cwd: string): EitherAsync.EitherAsync<string, string> =>
  EitherAsync.tryCatch(
    async () => (await _execFile(cmd, [...args], { cwd, maxBuffer: 16 * 1024 * 1024 })).stdout,
    (e) => _errorText(cmd, args, e)
  );

export const writeText = (file: string, text: string): EitherAsync.EitherAsync<string, void> =>
  EitherAsync.tryCatch(
    () => writeFile(file, text),
    (e) => `Could not write ${file}: ${(e as Error).message}`
  );

export const readText = (file: string): EitherAsync.EitherAsync<string, string> =>
  EitherAsync.tryCatch(
    () => readFile(file, 'utf8'),
    (e) => `Could not read ${file}: ${(e as Error).message}`
  );

/** Create a fresh temporary directory. */
export const makeTempDir = (prefix: string): EitherAsync.EitherAsync<string, string> =>
  EitherAsync.tryCatch(
    () => mkdtemp(join(tmpdir(), prefix)),
    (e) => `Could not create a temp directory: ${(e as Error).message}`
  );

/** sha1 hex digest of a file, as npm records in `shasum`. */
export const sha1File = (file: string): EitherAsync.EitherAsync<string, string> =>
  EitherAsync.tryCatch(
    async () =>
      createHash('sha1')
        .update(await readFile(file))
        .digest('hex'),
    (e) => `Could not hash ${file}: ${(e as Error).message}`
  );

export const nodeReleaseDeps: ReleaseDeps = { run, writeText, readText, exists: existsSync, makeTempDir, sha1File };
