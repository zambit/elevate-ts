import { describe, it, expect } from 'vitest';

import { packAndSmoke, parsePackFilename, verifyStaged } from '../../scripts/lib/release.js';

import { fakeDeps } from './fakeDeps.js';

const NAME = '@zambit/elevate-ts';
const ID = '11111111-2222-3333-4444-555555555555';
const TARBALL = `/tmp/work/zambit-elevate-ts-0.9.0-${ID}.tgz`;
const PKG_JSON = '/tmp/work/node_modules/@zambit/elevate-ts/package.json';

const manifest = JSON.stringify({
  name: NAME,
  version: '0.9.0',
  exports: { '.': { import: './dist/esm/index.js', require: './dist/cjs/index.js' } }
});

const staged = JSON.stringify([{ id: ID, packageName: NAME, version: '0.9.0', tag: 'latest', shasum: 'abc123' }]);

const LIST = `npm stage list ${NAME} --json`;

describe('parsePackFilename', () => {
  it('returns the filename of the single packed entry', () => {
    expect(parsePackFilename('{"name":"x","filename":"/tmp/work/zambit-elevate-ts-0.9.0.tgz","files":[]}')).toMatchObject({ tag: 'Right', right: '/tmp/work/zambit-elevate-ts-0.9.0.tgz' });
  });

  it('returns Left for an unexpected shape', () => {
    expect(parsePackFilename('[]').tag).toBe('Left');
    expect(parsePackFilename('{"name":"x"}').tag).toBe('Left');
    expect(parsePackFilename('null').tag).toBe('Left');
  });

  it('returns Left for invalid JSON', () => {
    const result = parsePackFilename('> husky install');
    expect(result.tag === 'Left' && result.left).toMatch(/Could not parse `pnpm pack --json`/);
  });
});

describe('packAndSmoke', () => {
  it('packs into a temp dir and smoke-tests the tarball', async () => {
    const fake = fakeDeps({
      commands: { 'pnpm pack --json --pack-destination /tmp/work --config.ignore-scripts=true': { ok: '{"filename":"/tmp/work/pkg.tgz"}' } },
      files: { [PKG_JSON]: manifest }
    });
    const result = await packAndSmoke(fake.deps)('/repo', NAME).run();
    expect(result).toMatchObject({ tag: 'Right', right: { entryPoints: 1 } });
    expect(fake.calls[0]).toMatchObject({ cmd: 'pnpm', cwd: '/repo' });
    expect(fake.calls[1]?.args).toContain('/tmp/work/pkg.tgz');
  });

  it('returns Left when pnpm pack fails', async () => {
    const fake = fakeDeps({ commands: { 'pnpm pack --json --pack-destination /tmp/work --config.ignore-scripts=true': { fail: 'pack failed' } } });
    expect(await packAndSmoke(fake.deps)('/repo', NAME).run()).toMatchObject({ tag: 'Left', left: 'pack failed' });
  });
});

describe('verifyStaged', () => {
  it('finds, downloads, checks the shasum and smoke-tests the staged tarball', async () => {
    const fake = fakeDeps({ commands: { [LIST]: { ok: staged } }, files: { [PKG_JSON]: manifest } });
    const result = await verifyStaged(fake.deps)(NAME, '0.9.0').run();
    expect(result).toMatchObject({ tag: 'Right', right: { item: { id: ID, tag: 'latest' }, tarball: TARBALL, smoke: { entryPoints: 1 } } });
    expect(fake.calls.map((c) => [c.cmd, ...c.args].join(' ')).slice(0, 3)).toEqual([LIST, `npm stage download ${ID}`, expect.stringContaining(`pnpm add ${TARBALL}`)]);
  });

  it('never runs npm stage approve', async () => {
    const fake = fakeDeps({ commands: { [LIST]: { ok: staged } }, files: { [PKG_JSON]: manifest } });
    await verifyStaged(fake.deps)(NAME, '0.9.0').run();
    expect(fake.calls.some((c) => c.args.includes('approve'))).toBe(false);
  });

  it('returns Left when the version is not staged', async () => {
    const fake = fakeDeps({ commands: { [LIST]: { ok: '[]' } } });
    const result = await verifyStaged(fake.deps)(NAME, '0.9.0').run();
    expect(result.tag === 'Left' && result.left).toMatch(/No staged version/);
    expect(fake.calls).toHaveLength(1);
  });

  it('returns Left when npm stage list fails (for example, not logged in)', async () => {
    const fake = fakeDeps({ commands: { [LIST]: { fail: 'E401 not logged in' } } });
    expect(await verifyStaged(fake.deps)(NAME, '0.9.0').run()).toMatchObject({ tag: 'Left', left: 'E401 not logged in' });
  });

  it('returns Left on a shasum mismatch, before installing anything', async () => {
    const fake = fakeDeps({ commands: { [LIST]: { ok: staged } }, sha1: 'tampered' });
    const result = await verifyStaged(fake.deps)(NAME, '0.9.0').run();
    expect(result.tag === 'Left' && result.left).toMatch(/Shasum mismatch/);
    expect(fake.calls.some((c) => c.args[0] === 'add')).toBe(false);
  });

  it('returns Left when the download fails', async () => {
    const fake = fakeDeps({ commands: { [LIST]: { ok: staged }, [`npm stage download ${ID}`]: { fail: 'E404' } } });
    expect(await verifyStaged(fake.deps)(NAME, '0.9.0').run()).toMatchObject({ tag: 'Left', left: 'E404' });
  });
});
