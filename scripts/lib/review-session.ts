// The interactive release review: shows each check, asks for a verdict, offers an
// optional trial in a real project, and builds the review record. Terminal I/O
// goes through a Prompter so the flow can be tested with scripted answers.

import * as EitherAsync from '../../src/EitherAsync.js';
import { pipe } from '../../src/Function.js';

import type { ReleaseDeps } from './release.js';
import { evidenceChecks, type CheckSpec } from './review-checks.js';
import type { Evidence } from './review-evidence.js';
import type { CheckResult, Verdict } from './review.js';

export type Prompter = {
  readonly say: (text: string) => void;
  readonly ask: (question: string) => Promise<string>;
};

export type ReviewDeps = ReleaseDeps & {
  /** Copy a project directory, skipping node_modules and .git. */
  readonly copyProject: (from: string, to: string) => EitherAsync.EitherAsync<string, void>;
};

const _VERDICTS: Readonly<Record<string, Verdict>> = { p: 'pass', pass: 'pass', f: 'fail', fail: 'fail', s: 'skip', skip: 'skip' };

const _render = (n: number, total: number, c: CheckSpec): string =>
  ['', `[${n}/${total}] ${c.title}`, ...c.facts.map((f) => `  ${f}`), ...c.warnings.map((w) => `  WARNING: ${w}`), `  ${c.question}`].join('\n');

/** Ask until the answer is a verdict; `v` shows the extra lines first. */
export const askVerdict = async (p: Prompter, more: readonly string[]): Promise<Verdict> => {
  const options = more.length > 0 ? '[p]ass / [f]ail / [s]kip / [v]iew more' : '[p]ass / [f]ail / [s]kip';
  for (;;) {
    const answer = (await p.ask(`  ${options}: `)).trim().toLowerCase();
    if (answer === 'v' && more.length > 0) p.say(more.join('\n'));
    else if (_VERDICTS[answer] !== undefined) return _VERDICTS[answer] as Verdict;
    else p.say('  Please answer p, f or s.');
  }
};

const _note = async (p: Prompter, verdict: Verdict): Promise<string> =>
  verdict === 'fail' ? (await p.ask('  What is wrong? ')).trim() : verdict === 'skip' ? (await p.ask('  Why skip? (optional) ')).trim() : '';

const _runCheck = async (p: Prompter, c: CheckSpec, n: number, total: number): Promise<CheckResult> => {
  p.say(_render(n, total, c));
  const verdict = await askVerdict(p, c.more);
  return { title: c.title, verdict, note: await _note(p, verdict), findings: c.findings };
};

/** Install the tarball into a copy of `project` and run its tests. Right(summary) when they pass. */
export const trialInProject =
  (deps: ReviewDeps) =>
  (tarball: string, project: string): EitherAsync.EitherAsync<string, string> =>
    pipe(
      deps.makeTempDir('elevate-ts-trial-'),
      EitherAsync.chain((dir: string) =>
        pipe(
          deps.copyProject(project, dir),
          EitherAsync.chain(() => deps.run('pnpm', ['install'], dir)),
          EitherAsync.chain(() => deps.run('pnpm', ['add', tarball], dir)),
          EitherAsync.chain(() => deps.run('pnpm', ['test'], dir)),
          EitherAsync.map(() => `pnpm test passed in a copy of ${project} (${dir})`)
        )
      )
    );

const _trial = async (deps: ReviewDeps, p: Prompter, e: Evidence, n: number): Promise<CheckResult> => {
  const title = 'Real-code trial (optional)';
  p.say(['', `[${n}/${n}] ${title}`, '  Installs the tarball into a temporary copy of a project that uses the library and runs its tests.'].join('\n'));
  const project = (await p.ask('  Path to a project (Enter to skip): ')).trim();
  if (project === '') return { title, verdict: 'skip', note: 'not run', findings: [] };
  p.say('  Running... (copying the project, pnpm install, pnpm add <tarball>, pnpm test)');
  const result = await trialInProject(deps)(e.tarball, project).run();
  p.say(result.tag === 'Right' ? `  OK: ${result.right}` : `  FAILED:\n${result.left}`);
  const verdict = await askVerdict(p, []);
  return { title, verdict, note: await _note(p, verdict), findings: [result.tag === 'Right' ? `tests passed in ${project}` : `tests failed in ${project}`] };
};

/** Walk the reviewer through every check, in order. */
export const runChecks = async (deps: ReviewDeps, p: Prompter, e: Evidence): Promise<readonly CheckResult[]> => {
  const checks = evidenceChecks(e);
  const total = checks.length + 1;
  const results: CheckResult[] = [];
  for (const [i, c] of checks.entries()) results.push(await _runCheck(p, c, i + 1, total));
  return [...results, await _trial(deps, p, e, total)];
};
