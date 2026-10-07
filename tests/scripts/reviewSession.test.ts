import { describe, it, expect } from 'vitest';

import * as Either from '../../src/Either.js';
import { changelogCheck, distTagCheck, evidenceChecks, filesCheck, readmeCheck } from '../../scripts/lib/review-checks.js';
import type { Evidence } from '../../scripts/lib/review-evidence.js';
import { askVerdict, runChecks, trialInProject, withOverride, type Prompter } from '../../scripts/lib/review-session.js';

import { fakeDeps } from './fakeDeps.js';

const evidence = (over: Partial<Evidence> = {}): Evidence => ({
  tarball: '/tmp/work/pkg.tgz',
  packageName: '@zambit/elevate-ts',
  version: '0.9.0',
  shasum: 'abc123',
  staged: Either.Right({ id: 'stage-1', packageName: '@zambit/elevate-ts', version: '0.9.0', tag: 'latest', shasum: 'abc123' }),
  files: ['README.md', 'dist/index.js', 'package.json'],
  suspicious: [],
  previous: Either.Right({ version: '0.8.0', files: { added: [], removed: [] }, readmeDiff: [] }),
  changelog: Either.Right('- shipped'),
  ...over
});

/** A prompter that answers from a script and records everything shown. */
const scripted = (answers: readonly string[]): Prompter & { readonly shown: string[]; readonly asked: string[] } => {
  const queue = [...answers];
  const shown: string[] = [];
  const asked: string[] = [];
  return {
    shown,
    asked,
    say: (t) => void shown.push(t),
    ask: (q) => (asked.push(q), queue.length === 0 ? Promise.reject(new Error('Input ended')) : Promise.resolve(queue.shift() as string))
  };
};

describe('checks', () => {
  it('distTagCheck shows the staged tag and warns on a mismatch', () => {
    const staged = Either.Right({ id: 's', packageName: 'p', version: '1.0.0-beta.1', tag: 'latest', shasum: 'x' });
    const c = distTagCheck(evidence({ version: '1.0.0-beta.1', staged }));
    expect(c.facts).toContain('Dist-tag: latest');
    expect(c.warnings[0]).toMatch(/pre-release/);
  });

  it('distTagCheck explains an unconfirmed tag', () => {
    const c = distTagCheck(evidence({ staged: Either.Left('Not logged in') }));
    expect(c.facts).toEqual(['Not logged in']);
    expect(c.warnings).toEqual(['Could not confirm the staged dist-tag.']);
  });

  it('filesCheck reports added/removed files, suspicious files, and lists everything under view more', () => {
    const c = filesCheck(evidence({ suspicious: ['.env'], previous: Either.Right({ version: '0.8.0', files: { added: ['.env'], removed: ['old.js'] }, readmeDiff: [] }) }));
    expect(c.facts).toEqual(['3 files', 'Added since 0.8.0 (1):', '  .env', 'Removed since 0.8.0 (1):', '  old.js']);
    expect(c.warnings[0]).toMatch(/\.env/);
    expect(c.more[0]).toBe('All files:');
    expect(c.findings).toContain('+1 / -1 vs 0.8.0');
  });

  it('filesCheck truncates long lists and handles a missing comparison', () => {
    const added = Array.from({ length: 25 }, (_, i) => `f${i}`);
    expect(filesCheck(evidence({ previous: Either.Right({ version: '0.8.0', files: { added, removed: [] }, readmeDiff: [] }) })).facts).toContain('  ... 5 more');
    expect(filesCheck(evidence({ previous: Either.Left('offline') })).facts).toEqual(['3 files', 'No comparison: offline']);
    expect(filesCheck(evidence()).facts).toEqual(['3 files', 'Same file list as 0.8.0']);
  });

  it('changelogCheck shows the entry or warns that it is missing', () => {
    expect(changelogCheck(evidence()).facts).toContain('  - shipped');
    expect(changelogCheck(evidence({ changelog: Either.Left('no entry') })).warnings).toEqual(['no entry']);
  });

  it('readmeCheck previews the diff and puts the rest under view more', () => {
    const diff = Array.from({ length: 45 }, (_, i) => `+ line ${i}`);
    const c = readmeCheck(evidence({ previous: Either.Right({ version: '0.8.0', files: { added: [], removed: [] }, readmeDiff: diff }) }));
    expect(c.facts).toHaveLength(41);
    expect(c.more).toHaveLength(5);
    expect(readmeCheck(evidence()).facts).toEqual(['README unchanged since 0.8.0']);
    expect(readmeCheck(evidence({ previous: Either.Left('offline') })).facts).toEqual(['offline']);
  });

  it('evidenceChecks returns the four checks in order', () => {
    expect(evidenceChecks(evidence()).map((c) => c.title)).toEqual(['Dist-tag', 'Files', 'Version and changelog', 'README']);
  });
});

describe('askVerdict', () => {
  it('accepts short and long answers, case-insensitively', async () => {
    expect(await askVerdict(scripted(['P']), [])).toBe('pass');
    expect(await askVerdict(scripted(['fail']), [])).toBe('fail');
    expect(await askVerdict(scripted([' s ']), [])).toBe('skip');
  });

  it('re-asks on an invalid answer', async () => {
    const p = scripted(['maybe', 'p']);
    expect(await askVerdict(p, [])).toBe('pass');
    expect(p.shown).toContain('  Please answer p, f or s.');
  });

  it('shows the extra lines on v, only when there are any', async () => {
    const p = scripted(['v', 'p']);
    await askVerdict(p, ['extra']);
    expect(p.shown).toContain('extra');
    expect(p.asked[0]).toContain('[v]iew more');
    const q = scripted(['v', 'p']);
    await askVerdict(q, []);
    expect(q.shown).toContain('  Please answer p, f or s.');
  });
});

describe('runChecks', () => {
  it('walks every check and records verdicts, notes and findings', async () => {
    const p = scripted(['p', 's', 'tag checked elsewhere', 'f', 'entry is wrong', 'p', '']);
    const results = await runChecks(fakeDeps().deps, p, evidence());
    expect(results.map((r) => [r.title, r.verdict, r.note])).toEqual([
      ['Dist-tag', 'pass', ''],
      ['Files', 'skip', 'tag checked elsewhere'],
      ['Version and changelog', 'fail', 'entry is wrong'],
      ['README', 'pass', ''],
      ['Real-code trial (optional)', 'skip', 'not run']
    ]);
    expect(p.shown.some((t) => t.startsWith('\n[1/5] Dist-tag'))).toBe(true);
  });

  it('runs the real-code trial when given a project path', async () => {
    const fake = fakeDeps({ existing: () => false });
    const results = await runChecks(fake.deps, scripted(['p', 'p', 'p', 'p', '/my/app', 'p']), evidence());
    expect(results[4]).toMatchObject({ verdict: 'pass', findings: ['tests passed in /my/app'] });
  });

  it('rejects when input ends before the review finishes', async () => {
    await expect(runChecks(fakeDeps().deps, scripted(['p']), evidence())).rejects.toThrow('Input ended');
  });
});

describe('withOverride', () => {
  it('appends an overrides block pointing the package at the tarball', () => {
    expect(withOverride("packages:\n  - 'packages/*'\n", '@zambit/elevate-ts', '/t.tgz')).toEqual(Either.Right('packages:\n  - \'packages/*\'\noverrides:\n  "@zambit/elevate-ts": "file:/t.tgz"\n'));
  });

  it('adds a newline when the file does not end with one', () => {
    expect(withOverride('packages: []', 'pkg', '/t.tgz')).toEqual(Either.Right('packages: []\noverrides:\n  "pkg": "file:/t.tgz"\n'));
  });

  it('returns Left when the file already has overrides', () => {
    expect(withOverride('packages: []\noverrides:\n  foo: 1.0.0\n', 'pkg', '/t.tgz')).toMatchObject({ tag: 'Left' });
  });
});

describe('trialInProject', () => {
  const single = { existing: (): boolean => false };
  const workspace = { files: { '/tmp/work/pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n" } };
  const lines = (calls: readonly { cmd: string; args: readonly string[] }[]): string[] => calls.map((c) => [c.cmd, ...c.args].join(' '));

  it('in a single project, installs, adds the tarball and runs the tests', async () => {
    const fake = fakeDeps(single);
    expect(await trialInProject(fake.deps)('/t.tgz', '/my/app', 'pkg').run()).toEqual(Either.Right('pnpm test passed in a copy of /my/app (/tmp/work)'));
    expect(lines(fake.calls)).toEqual(['copy /my/app /tmp/work', 'pnpm install', 'pnpm add /t.tgz', 'pnpm test']);
  });

  it("in a workspace, overrides the package and runs every member's tests", async () => {
    const fake = fakeDeps(workspace);
    expect(await trialInProject(fake.deps)('/t.tgz', '/my/ws', 'pkg').run()).toEqual(Either.Right('pnpm -r test passed in workspace in a copy of /my/ws (/tmp/work)'));
    expect(lines(fake.calls)).toEqual(['copy /my/ws /tmp/work', 'pnpm install', 'pnpm -r test']);
    expect(fake.written.get('/tmp/work/pnpm-workspace.yaml')).toContain('"pkg": "file:/t.tgz"');
  });

  it('in a workspace that already has overrides, stops before running pnpm', async () => {
    const fake = fakeDeps({ files: { '/tmp/work/pnpm-workspace.yaml': 'overrides:\n  foo: 1.0.0\n' } });
    expect(await trialInProject(fake.deps)('/t.tgz', '/my/ws', 'pkg').run()).toMatchObject({ tag: 'Left' });
    expect(lines(fake.calls)).toEqual(['copy /my/ws /tmp/work']);
  });

  it('returns Left when the tests fail or the copy fails', async () => {
    expect(await trialInProject(fakeDeps({ ...single, commands: { 'pnpm test': { fail: '1 failed' } } }).deps)('/t.tgz', '/my/app', 'pkg').run()).toMatchObject({ tag: 'Left', left: '1 failed' });
    expect(await trialInProject(fakeDeps({ ...workspace, commands: { 'pnpm -r test': { fail: '2 failed' } } }).deps)('/t.tgz', '/my/ws', 'pkg').run()).toMatchObject({ tag: 'Left', left: '2 failed' });
    expect(await trialInProject(fakeDeps({ copyFails: 'EACCES' }).deps)('/t.tgz', '/my/app', 'pkg').run()).toMatchObject({ tag: 'Left', left: 'EACCES' });
  });

  it('records a failed trial in the results', async () => {
    const fake = fakeDeps({ ...single, commands: { 'pnpm test': { fail: '1 failed' } } });
    const p = scripted(['p', 'p', 'p', 'p', '/my/app', 'f', 'tests broke']);
    const results = await runChecks(fake.deps, p, evidence());
    expect(results[4]).toMatchObject({ verdict: 'fail', note: 'tests broke', findings: ['tests failed in /my/app'] });
    expect(p.shown.some((t) => t.includes('FAILED'))).toBe(true);
  });
});
