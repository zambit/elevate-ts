import { describe, it, expect } from 'vitest';

import * as Either from '../../src/Either.js';
import * as EitherAsync from '../../src/EitherAsync.js';
import { COMMERCIAL_NAME, GITHUB_PACKAGES, buildCommercialTarball, publishCommercial, toCommercialManifest } from '../../scripts/lib/commercial.js';
import { handlePublishCommercial } from '../../scripts/release-check/handlers/publish-commercial.js';

import { fakeDeps, type FakeOptions } from './fakeDeps.js';

const PACK_ROOT = 'pnpm pack --json --pack-destination /tmp/work --config.ignore-scripts=true';
const AGPL_TGZ = '/tmp/work/zambit-elevate-ts-0.9.0.tgz';
const COMMERCIAL_TGZ = '/tmp/work/zambit-elevate-ts-commercial-0.9.0.tgz';
const PUBLISH = `npm publish ${COMMERCIAL_TGZ} --registry ${GITHUB_PACKAGES}`;

const agplManifest = JSON.stringify({
  name: '@zambit/elevate-ts',
  version: '0.9.0',
  license: 'AGPL-3.0-or-later',
  scripts: { prepare: 'husky' },
  publishConfig: { access: 'public' },
  exports: { '.': { import: './dist/esm/index.js', require: './dist/cjs/index.js' } }
});

const commercialManifest = JSON.stringify({ name: COMMERCIAL_NAME, version: '0.9.0', exports: { '.': { import: './dist/esm/index.js', require: './dist/cjs/index.js' } } });

// pnpm pack runs twice: first in the repo, then in the unpacked copy. The fake matches on the command
// line only, so the cwd decides which tarball comes back.
const setup = (over: FakeOptions = {}): ReturnType<typeof fakeDeps> => {
  const fake = fakeDeps({
    files: {
      '/repo/COMMERCIAL-LICENSE.md': '# Elevate TS Commercial License\n',
      '/tmp/work/package/package.json': agplManifest,
      [`/tmp/work/smoke/node_modules/${COMMERCIAL_NAME}/package.json`]: commercialManifest
    },
    commands: { [`tar -tzf ${COMMERCIAL_TGZ}`]: { ok: 'package/package.json\npackage/LICENSE\npackage/dist/esm/index.js\n' } },
    ...over
  });
  const run = fake.deps.run;
  const packed = (cwd: string): string => JSON.stringify({ filename: cwd === '/repo' ? AGPL_TGZ : COMMERCIAL_TGZ });
  return { ...fake, deps: { ...fake.deps, run: (cmd, args, cwd) => (cmd === 'pnpm' && args[0] === 'pack' ? EitherAsync.map(() => packed(cwd))(run(cmd, args, cwd)) : run(cmd, args, cwd)) } };
};

const lines = (fake: ReturnType<typeof fakeDeps>): string[] => fake.calls.map((c) => [c.cmd, ...c.args].join(' '));

describe('toCommercialManifest', () => {
  it('renames, relicenses and points the package at GitHub Packages', () => {
    const result = toCommercialManifest(JSON.parse(agplManifest));
    expect(result).toMatchObject({ tag: 'Right', right: { name: COMMERCIAL_NAME, version: '0.9.0', license: 'SEE LICENSE IN LICENSE', publishConfig: { registry: GITHUB_PACKAGES } } });
  });

  it('drops lifecycle scripts and the npmjs publish settings', () => {
    const result = toCommercialManifest(JSON.parse(agplManifest));
    expect(result.tag === 'Right' && result.right.scripts).toBeUndefined();
    expect(result.tag === 'Right' && result.right.publishConfig).toEqual({ registry: GITHUB_PACKAGES });
  });

  it('keeps everything else, such as exports', () => {
    const result = toCommercialManifest(JSON.parse(agplManifest));
    expect(result.tag === 'Right' && result.right.exports).toEqual(JSON.parse(agplManifest).exports);
  });

  it('returns Left when there is no version or the input is not an object', () => {
    expect(toCommercialManifest({ name: 'x' })).toEqual(Either.Left('package.json has no version'));
    expect(toCommercialManifest(null).tag).toBe('Left');
    expect(toCommercialManifest([]).tag).toBe('Left');
  });
});

describe('buildCommercialTarball', () => {
  it('packs, unpacks, swaps the license, rewrites the manifest and packs again', async () => {
    const fake = setup();
    expect(await buildCommercialTarball(fake.deps)('/repo', '/tmp/work').run()).toEqual(Either.Right(COMMERCIAL_TGZ));
    expect(lines(fake)).toEqual([PACK_ROOT, `tar -xzf ${AGPL_TGZ} -C /tmp/work`, PACK_ROOT]);
    expect(fake.calls[2]?.cwd).toBe('/tmp/work/package');
    expect(fake.written.get('/tmp/work/package/LICENSE')).toBe('# Elevate TS Commercial License\n');
    expect(JSON.parse(fake.written.get('/tmp/work/package/package.json') ?? '{}')).toMatchObject({ name: COMMERCIAL_NAME, license: 'SEE LICENSE IN LICENSE' });
  });

  it('writes nothing in the repo', async () => {
    const fake = setup();
    await buildCommercialTarball(fake.deps)('/repo', '/tmp/work').run();
    expect([...fake.written.keys()].every((f) => f.startsWith('/tmp/work/'))).toBe(true);
  });

  it('returns Left naming COMMERCIAL-LICENSE.md when it is missing', async () => {
    const fake = setup({ existing: (f) => !f.endsWith('COMMERCIAL-LICENSE.md') });
    const result = await buildCommercialTarball(fake.deps)('/repo', '/tmp/work').run();
    expect(result.tag === 'Left' && result.left).toMatch(/COMMERCIAL-LICENSE\.md not found/);
  });

  it('returns Left when the unpacked package.json is not valid JSON', async () => {
    const fake = setup({ files: { '/repo/COMMERCIAL-LICENSE.md': 'x', '/tmp/work/package/package.json': 'not json' } });
    const result = await buildCommercialTarball(fake.deps)('/repo', '/tmp/work').run();
    expect(result.tag === 'Left' && result.left).toMatch(/Could not parse package\.json/);
  });
});

describe('publishCommercial', () => {
  it('builds and smoke-tests but does not publish by default', async () => {
    const fake = setup();
    const result = await publishCommercial(fake.deps)('/repo', false).run();
    expect(result).toEqual(
      Either.Right({ name: COMMERCIAL_NAME, version: '0.9.0', tarball: COMMERCIAL_TGZ, files: ['package/package.json', 'package/LICENSE', 'package/dist/esm/index.js'], published: false })
    );
    expect(lines(fake)).not.toContain(PUBLISH);
  });

  it('publishes to GitHub Packages when asked', async () => {
    const fake = setup();
    expect(await publishCommercial(fake.deps)('/repo', true).run()).toMatchObject({ tag: 'Right', right: { published: true } });
    expect(lines(fake).at(-1)).toBe(PUBLISH);
  });

  it('smoke-tests the commercial package in its own directory', async () => {
    const fake = setup();
    await publishCommercial(fake.deps)('/repo', false).run();
    expect(fake.calls.find((c) => c.cmd === 'pnpm' && c.args[0] === 'add')).toMatchObject({ args: expect.arrayContaining([COMMERCIAL_TGZ]), cwd: '/tmp/work/smoke' });
  });

  it('does not publish when the smoke test fails', async () => {
    const fake = setup({ commands: { 'node smoke.cjs': { fail: 'Cannot find module' } } });
    expect(await publishCommercial(fake.deps)('/repo', true).run()).toMatchObject({ tag: 'Left', left: 'Cannot find module' });
    expect(lines(fake)).not.toContain(PUBLISH);
  });

  it('returns Left when publishing fails', async () => {
    const fake = setup({
      commands: { [`tar -tzf ${COMMERCIAL_TGZ}`]: { ok: 'package/package.json\n' }, [PUBLISH]: { fail: '403 Forbidden' } }
    });
    expect(await publishCommercial(fake.deps)('/repo', true).run()).toMatchObject({ tag: 'Left', left: '403 Forbidden' });
  });
});

describe('handlePublishCommercial', () => {
  it('passes the root and the publish flag through', async () => {
    const dry = setup();
    expect(await handlePublishCommercial(dry.deps)({ root: '/repo', publish: false }).run()).toMatchObject({ tag: 'Right', right: { published: false } });
    const real = setup();
    expect(await handlePublishCommercial(real.deps)({ root: '/repo', publish: true }).run()).toMatchObject({ tag: 'Right', right: { published: true } });
    expect(lines(real)).toContain(PUBLISH);
  });
});
