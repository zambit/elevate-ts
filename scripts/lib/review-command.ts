// Command layer for the human release review, shared by `pnpm review-tarball`
// and `pnpm verify-staged --review`: terminal prompts, the review record, and the
// closing instructions. It never approves; approving stays a manual 2FA step.

import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

import * as Either from '../../src/Either.js';

import { nodeReviewDeps, run } from './node-deps.js';
import { renderRecord, outcome, type CheckResult, type ReviewMeta } from './review.js';
import { gatherEvidence, type Evidence } from './review-evidence.js';
import { runChecks, type Prompter } from './review-session.js';
import type { StageItem } from './stage.js';

export type ReviewOptions = { readonly out?: string; readonly staged?: StageItem };

const _reviewer = async (cwd: string): Promise<string> => {
  const npmUser = await run('npm', ['whoami'], cwd).run();
  const gitUser = await run('git', ['config', 'user.name'], cwd).run();
  const names = [npmUser.tag === 'Right' ? `npm:${npmUser.right.trim()}` : '', gitUser.tag === 'Right' ? `git:${gitUser.right.trim()}` : ''];
  return names.filter((n) => n !== '').join(', ') || 'unknown';
};

const _meta = async (e: Evidence, cwd: string): Promise<ReviewMeta> => ({
  packageName: e.packageName,
  version: e.version,
  stageId: e.staged.tag === 'Right' ? e.staged.right.id : 'not confirmed',
  tag: e.staged.tag === 'Right' ? e.staged.right.tag : 'unknown',
  shasum: e.shasum,
  reviewer: await _reviewer(cwd),
  date: new Date().toISOString()
});

const _closing = (e: Evidence, results: readonly CheckResult[], recordPath: string): string => {
  const summary = results.map((r) => `  ${r.verdict.toUpperCase().padEnd(4)}  ${r.title}${r.note === '' ? '' : ` — ${r.note}`}`);
  const id = e.staged.tag === 'Right' ? e.staged.right.id : undefined;
  const next =
    outcome(results) === 'failed'
      ? [
          'A check failed. Do not approve.',
          ...(id === undefined ? [] : ['Reject the staged version (prompts for 2FA):', '', `  npm stage reject ${id}`]),
          '',
          'Then see "If a check fails" in docs/TESTING_STAGED_RELEASES.md.'
        ]
      : e.staged.tag === 'Left'
        ? ['No check failed, but the staged entry could not be confirmed:', `  ${e.staged.left}`, 'Confirm it with `npm stage list` before approving.']
        : ['No check failed. To release, approve (prompts for 2FA):', '', `  npm stage approve ${id}`];
  return ['', 'Review summary:', ...summary, '', `Review record: ${recordPath}`, '', ...next].join('\n');
};

/**
 * Reads answers line by line, in order. (readline's question() drops lines that
 * arrive before the question is asked, which breaks piped or pasted answers.)
 * If input ends mid-review, ask() rejects and the review stops without a record.
 */
const _prompter = (): Prompter & { close: () => void } => {
  const rl = createInterface({ input: stdin, terminal: false });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (q: string): Promise<string> => {
    stdout.write(q);
    const next = await lines.next();
    if (next.done === true) throw new Error('Input ended before the review finished.');
    return next.value;
  };
  return { say: (text) => console.log(text), ask, close: () => rl.close() };
};

/** Ask every check; Left if the reviewer's input ends early. */
const _collect = async (e: Evidence): Promise<Either.Either<string, readonly CheckResult[]>> => {
  const p = _prompter();
  const results = await runChecks(nodeReviewDeps, p, e).then(
    (r) => Either.Right<readonly CheckResult[]>(r),
    (err: unknown) => Either.Left<string>((err as Error).message)
  );
  p.close();
  return results;
};

/** Write the record and print the summary and next step. Returns the exit code. */
const _finish = async (e: Evidence, results: readonly CheckResult[], repoRoot: string, out: string | undefined): Promise<number> => {
  const recordPath = out ?? `${repoRoot}/reviews/releases/${e.version}.md`;
  const written = await nodeReviewDeps.writeText(recordPath, renderRecord(await _meta(e, repoRoot), results)).run();
  if (written.tag === 'Left') console.error(`[review] could not write the record: ${written.left}`);
  console.log(_closing(e, results, written.tag === 'Right' ? recordPath : '(not written)'));
  return outcome(results) === 'failed' ? 1 : 0;
};

/** Run the interactive review of `tarball`. Returns the process exit code. */
export const reviewTarball = async (tarball: string, repoRoot: string, opts: ReviewOptions = {}): Promise<number> => {
  console.log(`[review] gathering evidence for ${tarball}...`);
  const evidence = await gatherEvidence(nodeReviewDeps)(tarball, repoRoot, opts.staged).run();
  if (evidence.tag === 'Left') return (console.error(`[review] FAIL: ${evidence.left}`), 1);
  console.log(`[review] ${evidence.right.packageName}@${evidence.right.version}: ${evidenceSummary(evidence.right)}`);
  const results = await _collect(evidence.right);
  if (results.tag === 'Left') return (console.error(`\n[review] stopped: ${results.left} No record written.`), 1);
  return _finish(evidence.right, results.right, repoRoot, opts.out);
};

const evidenceSummary = (e: Evidence): string =>
  [
    `${e.files.length} files`,
    e.staged.tag === 'Right' ? `staged as ${e.staged.right.id}` : 'staged entry not confirmed',
    e.previous.tag === 'Right' ? `compared with ${e.previous.right.version}` : 'no previous version to compare'
  ].join(', ');
