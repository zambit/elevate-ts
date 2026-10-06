import { describe, it, expect } from 'vitest';

import {
  changelogEntry,
  diffFiles,
  lineDiff,
  outcome,
  parsePackFiles,
  parseVersions,
  previousVersion,
  renderRecord,
  suspiciousFiles,
  tagWarnings,
  tarballFiles,
  type CheckResult
} from '../../scripts/lib/review.js';
import { explainNpmError } from '../../scripts/lib/stage.js';

describe('tarballFiles', () => {
  it('strips the package/ prefix, drops directories and blanks, and sorts', () => {
    expect(tarballFiles('package/dist/b.js\npackage/dist/\npackage/README.md\n\n')).toEqual(['README.md', 'dist/b.js']);
  });
});

describe('suspiciousFiles', () => {
  it('flags files that usually should not ship', () => {
    const files = ['dist/index.js', '.env', 'config/.env.local', 'src/.DS_Store', 'dist/a.test.js', 'tests/x.ts', 'reviews/r.md', '.claude/m.md', 'notes.dontkeep.md', 'pkg.tgz', 'npm.log'];
    expect(suspiciousFiles(files)).toEqual(files.slice(1));
  });

  it('accepts a normal package', () => {
    expect(suspiciousFiles(['LICENSE', 'README.md', 'dist/esm/index.js', 'dist/esm/index.d.ts', 'package.json'])).toEqual([]);
  });
});

describe('diffFiles', () => {
  it('reports added and removed files', () => {
    expect(diffFiles(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual({ added: ['d'], removed: ['a'] });
  });
});

describe('previousVersion', () => {
  const published = ['0.1.2', '0.7.1', '0.8.0', '0.10.0', '1.0.0-beta.1', '1.0.0-beta.2', 'garbage'];

  it('picks the highest version below the target, comparing numerically', () => {
    expect(previousVersion(published, '0.10.1')).toMatchObject({ tag: 'Right', right: '0.10.0' });
    expect(previousVersion(published, '0.9.0')).toMatchObject({ tag: 'Right', right: '0.8.0' });
  });

  it('sorts pre-releases before their release', () => {
    expect(previousVersion(published, '1.0.0')).toMatchObject({ tag: 'Right', right: '1.0.0-beta.2' });
    expect(previousVersion(published, '1.0.0-beta.2')).toMatchObject({ tag: 'Right', right: '1.0.0-beta.1' });
  });

  it('returns Left when nothing is lower', () => {
    expect(previousVersion(published, '0.1.0').tag).toBe('Left');
  });

  it('returns Left for a non-semver target', () => {
    expect(previousVersion(published, 'next')).toMatchObject({ tag: 'Left', left: 'Not a semver version: next' });
  });
});

describe('parseVersions', () => {
  it('parses an array', () => {
    expect(parseVersions('["0.1.0","0.2.0"]')).toMatchObject({ tag: 'Right', right: ['0.1.0', '0.2.0'] });
  });

  it('accepts the bare string npm prints for a single version', () => {
    expect(parseVersions('"0.1.0"')).toMatchObject({ tag: 'Right', right: ['0.1.0'] });
  });

  it('returns Left for other shapes and invalid JSON', () => {
    expect(parseVersions('{"a":1}').tag).toBe('Left');
    expect(parseVersions('nope').tag).toBe('Left');
  });
});

describe('parsePackFiles', () => {
  it('returns sorted paths from npm pack --dry-run --json', () => {
    expect(parsePackFiles('[{"files":[{"path":"b"},{"path":"a"}]}]')).toMatchObject({ tag: 'Right', right: ['a', 'b'] });
  });

  it('returns Left for other shapes and invalid JSON', () => {
    expect(parsePackFiles('[]').tag).toBe('Left');
    expect(parsePackFiles('[{"files":[{"size":1}]}]').tag).toBe('Left');
    expect(parsePackFiles('nope').tag).toBe('Left');
  });
});

describe('changelogEntry', () => {
  const changelog = '# Changelog\n\n## 0.9.0\n\n### Minor\n\n- thing\n\n## 0.8.0\n\n- older\n';

  it('returns the body up to the next version heading', () => {
    expect(changelogEntry(changelog, '0.9.0')).toMatchObject({ tag: 'Right', right: '### Minor\n\n- thing' });
  });

  it('returns the body to the end for the last entry', () => {
    expect(changelogEntry(changelog, '0.8.0')).toMatchObject({ tag: 'Right', right: '- older' });
  });

  it('returns Left when the version has no entry', () => {
    expect(changelogEntry(changelog, '1.0.0')).toMatchObject({ tag: 'Left', left: 'CHANGELOG.md has no "## 1.0.0" entry' });
  });
});

describe('tagWarnings', () => {
  it('warns about a pre-release tagged latest', () => {
    expect(tagWarnings('1.0.0-beta.1', 'latest')[0]).toMatch(/pre-release but is tagged "latest"/);
  });

  it('warns about a normal release not tagged latest', () => {
    expect(tagWarnings('1.0.0', 'next')[0]).toMatch(/tagged "next", not "latest"/);
  });

  it('accepts the expected pairings', () => {
    expect(tagWarnings('1.0.0', 'latest')).toEqual([]);
    expect(tagWarnings('1.0.0-beta.1', 'next')).toEqual([]);
  });
});

describe('lineDiff', () => {
  it('is empty for equal text', () => {
    expect(lineDiff('a\nb', 'a\nb')).toEqual([]);
  });

  it('shows a changed line as removal then addition', () => {
    expect(lineDiff('a\nold\nc', 'a\nnew\nc')).toEqual(['- old', '+ new']);
  });

  it('handles pure additions and removals at either end', () => {
    expect(lineDiff('b', 'a\nb\nc')).toEqual(['+ a', '+ c']);
    expect(lineDiff('a\nb\nc', 'b')).toEqual(['- a', '- c']);
  });
});

const result = (verdict: CheckResult['verdict'], note = ''): CheckResult => ({ title: `Check ${verdict}`, verdict, note, findings: ['a finding'] });

describe('outcome', () => {
  it('fails if any check failed', () => {
    expect(outcome([result('pass'), result('fail'), result('skip')])).toBe('failed');
  });

  it('passes otherwise, even with skips', () => {
    expect(outcome([result('pass'), result('skip')])).toBe('passed');
  });
});

describe('renderRecord', () => {
  const meta = { packageName: '@zambit/elevate-ts', version: '0.9.0', stageId: 'id-1', tag: 'latest', shasum: 'abc', reviewer: 'npm:me', date: '2026-10-06T00:00:00.000Z' };

  it('renders the header, outcome and one block per check', () => {
    const md = renderRecord(meta, [result('pass'), result('fail', 'bad README')]);
    expect(md).toContain('# Release Review: @zambit/elevate-ts@0.9.0');
    expect(md).toContain('- **Outcome:** failed');
    expect(md).toContain('### Check fail\n\n- **Verdict:** fail\n- **Note:** bad README\n- a finding');
    expect(md).not.toContain('- **Note:** \n');
  });
});

describe('explainNpmError', () => {
  it('turns auth failures into a login hint', () => {
    expect(explainNpmError('npm warn x\nnpm error code E401\nnpm error Unable to authenticate')).toMatch(/Run `npm login`/);
    expect(explainNpmError('npm error code ENEEDAUTH')).toMatch(/npm login/);
  });

  it('keeps only npm error lines otherwise', () => {
    expect(explainNpmError('npm warn noise\nnpm error code E404\nnpm error A complete log of this run can be found in: x')).toBe('npm error code E404');
  });

  it('returns the text unchanged when there are no npm error lines', () => {
    expect(explainNpmError('tar: cannot open')).toBe('tar: cannot open');
  });
});
