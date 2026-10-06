import { describe, it, expect } from 'vitest';

import { gatherEvidence } from '../../scripts/lib/review-evidence.js';
import type { StageItem } from '../../scripts/lib/stage.js';

import { fakeDeps } from './fakeDeps.js';

const T = '/tmp/work/pkg.tgz';
const NAME = '@zambit/elevate-ts';

const item: StageItem = { id: 'stage-1', packageName: NAME, version: '0.9.0', tag: 'latest', shasum: 'abc123' };

const happy = {
  [`tar -tzf ${T}`]: { ok: 'package/package.json\npackage/README.md\npackage/dist/index.js\npackage/.env\n' },
  [`tar -xOzf ${T} package/package.json`]: { ok: JSON.stringify({ name: NAME, version: '0.9.0' }) },
  [`tar -xOzf ${T} package/README.md`]: { ok: '# elevate-ts\nnew line\n' },
  [`npm stage list ${NAME} --json`]: { ok: JSON.stringify([item]) },
  [`npm view ${NAME} versions --json`]: { ok: '["0.7.1","0.8.0"]' },
  [`npm pack ${NAME}@0.8.0 --dry-run --json`]: { ok: JSON.stringify([{ files: [{ path: 'package.json' }, { path: 'README.md' }, { path: 'dist/old.js' }] }]) },
  [`npm view ${NAME}@0.8.0 readme`]: { ok: '# elevate-ts\nold line\n' }
};

const changelog = { '/repo/CHANGELOG.md': '# Changelog\n\n## 0.9.0\n\n- shipped\n\n## 0.8.0\n' };

describe('gatherEvidence', () => {
  it('collects tarball facts, the staged entry, the previous release and the changelog', async () => {
    const fake = fakeDeps({ commands: happy, files: changelog });
    const result = await gatherEvidence(fake.deps)(T, '/repo').run();
    expect(result.tag).toBe('Right');
    if (result.tag !== 'Right') return;
    const e = result.right;
    expect(e).toMatchObject({ packageName: NAME, version: '0.9.0', shasum: 'abc123', suspicious: ['.env'] });
    expect(e.files).toEqual(['.env', 'README.md', 'dist/index.js', 'package.json']);
    expect(e.staged).toMatchObject({ tag: 'Right', right: { id: 'stage-1' } });
    expect(e.previous).toMatchObject({ tag: 'Right', right: { version: '0.8.0', files: { added: ['.env', 'dist/index.js'], removed: ['dist/old.js'] }, readmeDiff: ['- old line', '+ new line'] } });
    expect(e.changelog).toMatchObject({ tag: 'Right', right: '- shipped' });
  });

  it('uses a staged entry supplied by the caller without querying npm', async () => {
    const fake = fakeDeps({ commands: happy, files: changelog });
    const result = await gatherEvidence(fake.deps)(T, '/repo', { ...item, id: 'given' }).run();
    expect(result.tag === 'Right' && result.right.staged).toMatchObject({ tag: 'Right', right: { id: 'given' } });
    expect(fake.calls.some((c) => c.args.includes('stage'))).toBe(false);
  });

  it('degrades optional evidence to explanations instead of failing', async () => {
    const fake = fakeDeps({
      commands: {
        ...happy,
        [`npm stage list ${NAME} --json`]: { fail: 'npm error code E401' },
        [`npm view ${NAME} versions --json`]: { fail: 'npm error code E404\nnpm error Not found' }
      }
    });
    const result = await gatherEvidence(fake.deps)(T, '/repo').run();
    expect(result.tag).toBe('Right');
    if (result.tag !== 'Right') return;
    expect(result.right.staged).toMatchObject({ tag: 'Left', left: expect.stringMatching(/npm login/) });
    expect(result.right.previous).toMatchObject({ tag: 'Left', left: 'npm error code E404\nnpm error Not found' });
    expect(result.right.changelog).toMatchObject({ tag: 'Left', left: 'ENOENT /repo/CHANGELOG.md' });
  });

  it('reports a tarball that is not staged', async () => {
    const fake = fakeDeps({ commands: happy, files: changelog, sha1: 'different' });
    const result = await gatherEvidence(fake.deps)(T, '/repo').run();
    expect(result.tag === 'Right' && result.right.staged).toMatchObject({ tag: 'Left', left: 'Not staged on npm (no staged entry with shasum different)' });
  });

  it('fails when the tarball cannot be listed', async () => {
    const fake = fakeDeps({ commands: { ...happy, [`tar -tzf ${T}`]: { fail: 'tar: bad archive' } } });
    expect(await gatherEvidence(fake.deps)(T, '/repo').run()).toMatchObject({ tag: 'Left', left: 'tar: bad archive' });
  });

  it("fails when the tarball's package.json is unreadable", async () => {
    const fake = fakeDeps({ commands: { ...happy, [`tar -xOzf ${T} package/package.json`]: { ok: '{"name":1}' } } });
    expect(await gatherEvidence(fake.deps)(T, '/repo').run()).toMatchObject({ tag: 'Left', left: 'Tarball package.json has no name/version' });
    const fake2 = fakeDeps({ commands: { ...happy, [`tar -xOzf ${T} package/package.json`]: { ok: 'nope' } } });
    expect((await gatherEvidence(fake2.deps)(T, '/repo').run()).tag).toBe('Left');
  });
});
