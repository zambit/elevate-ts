// Package smoke test: install a packed tarball into a throwaway consumer project
// and prove every subpath export resolves and loads under both ESM and CJS.
// Shared by `pnpm smoke:package` (CI, before staging) and `pnpm verify-staged`
// (maintainer, against the staged tarball).

import * as Either from '../../src/Either.js';
import * as EitherAsync from '../../src/EitherAsync.js';
import { pipe } from '../../src/Function.js';

/** Side effects the smoke test needs; injected so tests can fake them. */
export type SmokeDeps = {
  readonly run: (cmd: string, args: readonly string[], cwd: string) => EitherAsync.EitherAsync<string, string>;
  readonly writeText: (file: string, text: string) => EitherAsync.EitherAsync<string, void>;
  readonly readText: (file: string) => EitherAsync.EitherAsync<string, string>;
  readonly exists: (file: string) => boolean;
};

export type ExportsMap = Readonly<Record<string, Readonly<Record<string, string>>>>;

export type Manifest = { readonly name: string; readonly version: string; readonly exports: ExportsMap };

export type SmokeReport = { readonly name: string; readonly version: string; readonly entryPoints: number };

const _isRecord = (u: unknown): u is Record<string, unknown> => typeof u === 'object' && u !== null && !Array.isArray(u);

const _isStringRecord = (u: unknown): boolean => _isRecord(u) && Object.values(u).every((v) => typeof v === 'string');

const _isManifest = (u: unknown): u is Manifest =>
  _isRecord(u) && typeof u.name === 'string' && typeof u.version === 'string' && _isRecord(u.exports) && Object.values(u.exports).every(_isStringRecord);

/** Parse an installed package's package.json, requiring a conditional `exports` map. */
export const parseManifest = (raw: string): Either.Either<string, Manifest> =>
  Either.chain((json: unknown) => (_isManifest(json) ? Either.Right(json) : Either.Left<string>('Installed package.json has no name/version or a non-conditional exports map')))(
    Either.tryCatch(
      (): unknown => JSON.parse(raw),
      (e) => `Could not parse installed package.json: ${(e as Error).message}`
    )
  );

/** Import specifiers for each subpath export: `.` → `pkg`, `./X` → `pkg/X`. */
export const specifiers = (m: Manifest): readonly string[] => Object.keys(m.exports).map((k) => (k === '.' ? m.name : `${m.name}/${k.slice(2)}`));

/** Export targets (relative to the package root) that are missing on disk. */
export const missingTargets =
  (pkgDir: string, exists: (file: string) => boolean) =>
  (m: Manifest): readonly string[] =>
    Object.values(m.exports)
      .flatMap((conditions) => Object.values(conditions))
      .filter((target) => !exists(`${pkgDir}/${target.replace(/^\.\//, '')}`));

const _codecProbe = (load: string): string => `{ const r = ${load}.bigint()('42'); if (r.tag !== 'Success' || r.value !== 42n) throw new Error('Codec.bigint round-trip failed'); }`;

/** Source of a smoke script; `load` turns a specifier into a module expression. */
export const smokeSource = (specs: readonly string[], load: (spec: string) => string, label: string): string => {
  const check = `const check = (s, m) => { if (Object.keys(m).length === 0) throw new Error(s + ' has no exports'); };`;
  const lines = specs.map((s) => `check(${JSON.stringify(s)}, ${load(JSON.stringify(s))});`);
  const codec = specs.find((s) => s.endsWith('/Codec'));
  const probe = codec === undefined ? [] : [_codecProbe(load(JSON.stringify(codec)))];
  return [check, ...lines, ...probe, `console.log('${label} ok: ${specs.length} entry points');`, ''].join('\n');
};

export const esmLoad = (spec: string): string => `(await import(${spec}))`;

export const cjsLoad = (spec: string): string => `require(${spec})`;

const _CONSUMER = JSON.stringify({ name: 'elevate-ts-smoke', private: true, type: 'module' }, null, 2);

const _install = (deps: SmokeDeps, tarball: string, dir: string) => (): EitherAsync.EitherAsync<string, string> =>
  pipe(
    deps.writeText(`${dir}/package.json`, _CONSUMER),
    EitherAsync.chain(() => deps.run('pnpm', ['add', tarball, '--ignore-scripts', '--config.lockfile=false'], dir))
  );

const _checkTargets =
  (deps: SmokeDeps, pkgDir: string) =>
  (m: Manifest): Either.Either<string, Manifest> => {
    const missing = missingTargets(pkgDir, deps.exists)(m);
    return missing.length === 0 ? Either.Right(m) : Either.Left(`Export targets missing from the tarball: ${missing.join(', ')}`);
  };

const _runScripts =
  (deps: SmokeDeps, dir: string) =>
  (m: Manifest): EitherAsync.EitherAsync<string, SmokeReport> =>
    pipe(
      deps.writeText(`${dir}/smoke.mjs`, smokeSource(specifiers(m), esmLoad, 'esm')),
      EitherAsync.chain(() => deps.writeText(`${dir}/smoke.cjs`, smokeSource(specifiers(m), cjsLoad, 'cjs'))),
      EitherAsync.chain(() => deps.run('node', ['smoke.mjs'], dir)),
      EitherAsync.chain(() => deps.run('node', ['smoke.cjs'], dir)),
      EitherAsync.map((): SmokeReport => ({ name: m.name, version: m.version, entryPoints: specifiers(m).length }))
    );

/** Install `tarball` into `dir` and smoke-test package `packageName`. */
export const smokeTestTarball =
  (deps: SmokeDeps) =>
  (tarball: string, dir: string, packageName: string): EitherAsync.EitherAsync<string, SmokeReport> =>
    pipe(
      _install(deps, tarball, dir)(),
      EitherAsync.chain(() => deps.readText(`${dir}/node_modules/${packageName}/package.json`)),
      EitherAsync.chain((raw) => EitherAsync.liftEither(Either.chain(_checkTargets(deps, `${dir}/node_modules/${packageName}`))(parseManifest(raw)))),
      EitherAsync.chain(_runScripts(deps, dir))
    );
