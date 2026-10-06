// Handlers behind `pnpm release-check` (scripts/release-check/handlers).

import { describe, it, expect } from 'vitest';

import { readPackageName, smokeTarball } from '../../scripts/lib/release.js';
import { validateTarball, validateVersion } from '../../scripts/release-check/handlers/args.js';
import { handleCheck } from '../../scripts/release-check/handlers/check.js';
import { handleReviewArgs } from '../../scripts/release-check/handlers/review.js';
import { handleSmoke } from '../../scripts/release-check/handlers/smoke.js';
import { handleVerify } from '../../scripts/release-check/handlers/verify.js';

import { fakeDeps } from './fakeDeps.js';

const NAME = '@zambit/elevate-ts';
const T = '/abs/pkg.tgz';
const manifest = JSON.stringify({ name: NAME, version: '0.9.0', exports: { '.': { import: './dist/esm/index.js', require: './dist/cjs/index.js' } } });
const INSTALLED = `/tmp/work/node_modules/${NAME}/package.json`;
const tarballManifest = { [`tar -xOzf ${T} package/package.json`]: { ok: manifest } };

describe('validateVersion', () => {
  it('accepts semver, including pre-releases', () => {
    expect(validateVersion('0.9.0')).toMatchObject({ tag: 'Right', right: '0.9.0' });
    expect(validateVersion('1.0.0-beta.1').tag).toBe('Right');
  });

  it('rejects anything else', () => {
    expect(validateVersion('latest')).toMatchObject({ tag: 'Left', left: 'Not a version: "latest" (expected semver, for example 0.9.0)' });
  });
});

describe('validateTarball', () => {
  it('requires a .tgz that exists', () => {
    expect(validateTarball(() => true)('/a.tgz')).toMatchObject({ tag: 'Right', right: '/a.tgz' });
    expect(validateTarball(() => true)('/a.txt')).toMatchObject({ tag: 'Left', left: 'Not a tarball: "/a.txt" (expected a .tgz file)' });
    expect(validateTarball(() => false)('/a.tgz')).toMatchObject({ tag: 'Left', left: 'No such file: /a.tgz' });
  });
});

describe('readPackageName', () => {
  it('reads the name from package.json at the root', async () => {
    const fake = fakeDeps({ files: { '/repo/package.json': manifest } });
    expect(await readPackageName(fake.deps)('/repo').run()).toMatchObject({ tag: 'Right', right: NAME });
  });

  it('returns Left for a missing name or invalid JSON', async () => {
    expect(await readPackageName(fakeDeps({ files: { '/repo/package.json': '{}' } }).deps)('/repo').run()).toMatchObject({ tag: 'Left', left: '/repo/package.json has no package name' });
    expect((await readPackageName(fakeDeps({ files: { '/repo/package.json': '{' } }).deps)('/repo').run()).tag).toBe('Left');
  });
});

describe('smokeTarball', () => {
  it("smoke-tests a tarball under the name in the tarball's own package.json, without packing", async () => {
    const fake = fakeDeps({ commands: tarballManifest, files: { [INSTALLED]: manifest } });
    expect(await smokeTarball(fake.deps)(T).run()).toMatchObject({ tag: 'Right', right: { name: NAME, entryPoints: 1 } });
    expect(fake.calls.some((c) => c.args[0] === 'pack')).toBe(false);
  });

  it("returns Left when the tarball's package.json is unusable", async () => {
    const fake = fakeDeps({ commands: { [`tar -xOzf ${T} package/package.json`]: { ok: '{"version":"1.0.0"}' } } });
    expect(await smokeTarball(fake.deps)(T).run()).toMatchObject({ tag: 'Left', left: "the tarball's package.json has no package name" });
  });
});

describe('handleSmoke', () => {
  it('packs the current build when no tarball is given', async () => {
    const fake = fakeDeps({
      commands: { 'pnpm pack --json --pack-destination /tmp/work --config.ignore-scripts=true': { ok: '{"filename":"/tmp/work/p.tgz"}' } },
      files: { '/repo/package.json': manifest, [INSTALLED]: manifest }
    });
    expect(await handleSmoke(fake.deps)({ root: '/repo' }).run()).toMatchObject({ tag: 'Right', right: { name: NAME } });
    expect(fake.calls[0]).toMatchObject({ cmd: 'pnpm', args: expect.arrayContaining(['pack']) });
  });

  it('tests the given tarball when one is passed', async () => {
    const fake = fakeDeps({ commands: tarballManifest, files: { [INSTALLED]: manifest } });
    expect((await handleSmoke(fake.deps)({ tarball: T, root: '/repo' }).run()).tag).toBe('Right');
  });

  it('rejects a non-tarball argument before doing anything', async () => {
    const fake = fakeDeps();
    expect(await handleSmoke(fake.deps)({ tarball: '/abs/notes.txt', root: '/repo' }).run()).toMatchObject({ tag: 'Left', left: expect.stringMatching(/Not a tarball/) });
    expect(fake.calls).toHaveLength(0);
  });
});

describe('handleCheck', () => {
  it('runs the smoke test on the tarball', async () => {
    const fake = fakeDeps({ commands: tarballManifest, files: { [INSTALLED]: manifest } });
    expect(await handleCheck(fake.deps)({ tarball: T, root: '/repo' }).run()).toMatchObject({ tag: 'Right', right: { entryPoints: 1 } });
  });

  it('returns Left when an export target is missing', async () => {
    const fake = fakeDeps({ commands: tarballManifest, files: { [INSTALLED]: manifest }, existing: (f) => !f.includes('/cjs/') });
    expect(await handleCheck(fake.deps)({ tarball: T, root: '/repo' }).run()).toMatchObject({ tag: 'Left', left: expect.stringMatching(/Export targets missing/) });
  });
});

describe('handleVerify', () => {
  it('rejects an invalid version before contacting npm', async () => {
    const fake = fakeDeps();
    expect((await handleVerify(fake.deps)({ version: 'latest', root: '/repo' }).run()).tag).toBe('Left');
    expect(fake.calls).toHaveLength(0);
  });

  it('verifies the staged version for the package at the root', async () => {
    const staged = JSON.stringify([{ id: 'stage-1', packageName: NAME, version: '0.9.0', tag: 'latest', shasum: 'abc123' }]);
    const fake = fakeDeps({ commands: { [`npm stage list ${NAME} --json`]: { ok: staged } }, files: { '/repo/package.json': manifest, [INSTALLED]: manifest } });
    expect(await handleVerify(fake.deps)({ version: '0.9.0', root: '/repo' }).run()).toMatchObject({ tag: 'Right', right: { item: { id: 'stage-1' } } });
  });
});

describe('handleReviewArgs', () => {
  it('passes valid arguments through', () => {
    expect(handleReviewArgs(() => true)({ tarball: T, out: '/r.md' })).toMatchObject({ tag: 'Right', right: { tarball: T, out: '/r.md' } });
  });

  it('rejects a missing tarball', () => {
    expect(handleReviewArgs(() => false)({ tarball: T })).toMatchObject({ tag: 'Left', left: `No such file: ${T}` });
  });
});
