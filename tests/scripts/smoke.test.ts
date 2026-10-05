import { describe, it, expect } from 'vitest';

import { cjsLoad, esmLoad, missingTargets, parseManifest, smokeSource, smokeTestTarball, specifiers, type Manifest } from '../../scripts/lib/smoke.js';

import { fakeDeps } from './fakeDeps.js';

const manifest: Manifest = {
  name: '@zambit/elevate-ts',
  version: '0.9.0',
  exports: {
    '.': { import: './dist/esm/index.js', require: './dist/cjs/index.js', types: './dist/esm/index.d.ts' },
    './Codec': { import: './dist/esm/Codec.js', require: './dist/cjs/Codec.js', types: './dist/esm/Codec.d.ts' }
  }
};

const PKG_JSON = '/tmp/work/node_modules/@zambit/elevate-ts/package.json';

describe('parseManifest', () => {
  it('parses a manifest with a conditional exports map', () => {
    expect(parseManifest(JSON.stringify({ ...manifest, license: 'AGPL' }))).toMatchObject({ tag: 'Right', right: { name: manifest.name } });
  });

  it('returns Left for invalid JSON', () => {
    const result = parseManifest('{');
    expect(result.tag === 'Left' && result.left).toMatch(/Could not parse installed package.json/);
  });

  it('returns Left for a string exports field', () => {
    expect(parseManifest(JSON.stringify({ name: 'x', version: '1.0.0', exports: './index.js' })).tag).toBe('Left');
  });

  it('returns Left when exports conditions are not strings', () => {
    expect(parseManifest(JSON.stringify({ name: 'x', version: '1.0.0', exports: { '.': { import: 1 } } })).tag).toBe('Left');
  });
});

describe('specifiers', () => {
  it('maps . to the package name and ./X to pkg/X', () => {
    expect(specifiers(manifest)).toEqual(['@zambit/elevate-ts', '@zambit/elevate-ts/Codec']);
  });
});

describe('missingTargets', () => {
  it('returns nothing when every target exists', () => {
    expect(missingTargets('/pkg', () => true)(manifest)).toEqual([]);
  });

  it('returns targets absent from disk, checked under the package dir', () => {
    const seen: string[] = [];
    const exists = (f: string): boolean => (seen.push(f), !f.endsWith('Codec.d.ts'));
    expect(missingTargets('/pkg', exists)(manifest)).toEqual(['./dist/esm/Codec.d.ts']);
    expect(seen).toContain('/pkg/dist/esm/index.js');
  });
});

describe('smokeSource', () => {
  it('checks every specifier with the given loader', () => {
    const src = smokeSource(specifiers(manifest), esmLoad, 'esm');
    expect(src).toContain('check("@zambit/elevate-ts", (await import("@zambit/elevate-ts")));');
    expect(src).toContain("console.log('esm ok: 2 entry points');");
  });

  it('adds a Codec round-trip probe when a Codec export exists', () => {
    expect(smokeSource(specifiers(manifest), cjsLoad, 'cjs')).toContain('require("@zambit/elevate-ts/Codec").bigint()');
  });

  it('omits the Codec probe when there is no Codec export', () => {
    expect(smokeSource(['@zambit/elevate-ts'], cjsLoad, 'cjs')).not.toContain('bigint');
  });

  it('produces runnable scripts that pass for loadable modules', async () => {
    const src = smokeSource(['node:path'], esmLoad, 'esm');
    const module = await import(`data:text/javascript,${encodeURIComponent(src.replace("console.log('esm ok: 1 entry points');", ''))}`);
    expect(module).toBeDefined();
  });
});

describe('smokeTestTarball', () => {
  it('installs, checks targets, writes both scripts and runs them', async () => {
    const fake = fakeDeps({ files: { [PKG_JSON]: JSON.stringify(manifest) } });
    const result = await smokeTestTarball(fake.deps)('/tmp/work/pkg.tgz', '/tmp/work', manifest.name).run();
    expect(result).toMatchObject({ tag: 'Right', right: { name: manifest.name, version: '0.9.0', entryPoints: 2 } });
    expect(fake.calls.map((c) => [c.cmd, ...c.args].join(' '))).toEqual(['pnpm add /tmp/work/pkg.tgz --ignore-scripts --config.lockfile=false', 'node smoke.mjs', 'node smoke.cjs']);
    expect([...fake.written.keys()]).toEqual(['/tmp/work/package.json', '/tmp/work/smoke.mjs', '/tmp/work/smoke.cjs']);
  });

  it('returns Left when pnpm add fails, without running the scripts', async () => {
    const fake = fakeDeps({ commands: { 'pnpm add /t.tgz --ignore-scripts --config.lockfile=false': { fail: 'E404' } } });
    expect(await smokeTestTarball(fake.deps)('/t.tgz', '/tmp/work', manifest.name).run()).toMatchObject({ tag: 'Left', left: 'E404' });
    expect(fake.calls).toHaveLength(1);
  });

  it('returns Left listing missing export targets', async () => {
    const fake = fakeDeps({ files: { [PKG_JSON]: JSON.stringify(manifest) }, existing: (f) => !f.includes('/cjs/') });
    const result = await smokeTestTarball(fake.deps)('/t.tgz', '/tmp/work', manifest.name).run();
    expect(result.tag === 'Left' && result.left).toBe('Export targets missing from the tarball: ./dist/cjs/index.js, ./dist/cjs/Codec.js');
  });

  it('returns Left when a smoke script fails', async () => {
    const fake = fakeDeps({ files: { [PKG_JSON]: JSON.stringify(manifest) }, commands: { 'node smoke.cjs': { fail: 'Codec.bigint round-trip failed' } } });
    const result = await smokeTestTarball(fake.deps)('/t.tgz', '/tmp/work', manifest.name).run();
    expect(result).toMatchObject({ tag: 'Left', left: 'Codec.bigint round-trip failed' });
  });
});
