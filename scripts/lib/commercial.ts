// The commercial flavor: the same build, renamed to @zambit/elevate-ts-commercial,
// licensed under COMMERCIAL-LICENSE.md, and published to GitHub Packages. Built in a
// temporary directory from a packed copy, so the working tree is never modified.

import * as Either from '../../src/Either.js';
import * as EitherAsync from '../../src/EitherAsync.js';
import { pipe } from '../../src/Function.js';

import { parsePackFilename, type ReleaseDeps } from './release.js';
import { smokeTestTarball, type SmokeReport } from './smoke.js';

export const COMMERCIAL_NAME = '@zambit/elevate-ts-commercial';
export const GITHUB_PACKAGES = 'https://npm.pkg.github.com';

export type CommercialReport = {
  readonly name: string;
  readonly version: string;
  readonly tarball: string;
  readonly files: readonly string[];
  readonly published: boolean;
};

type Json = Readonly<Record<string, unknown>>;

// Fields that make no sense in the commercial package: lifecycle scripts, and the npmjs publish settings.
const _DROP = new Set(['scripts', 'publishConfig']);

const _isRecord = (u: unknown): u is Json => typeof u === 'object' && u !== null && !Array.isArray(u);

/** The commercial package.json: renamed, relicensed, pointed at GitHub Packages, without scripts. */
export const toCommercialManifest = (pkg: unknown): Either.Either<string, Json> =>
  _isRecord(pkg) && typeof pkg.version === 'string'
    ? Either.Right({
        ...Object.fromEntries(Object.entries(pkg).filter(([k]) => !_DROP.has(k))),
        name: COMMERCIAL_NAME,
        license: 'SEE LICENSE IN LICENSE',
        publishConfig: { registry: GITHUB_PACKAGES }
      })
    : Either.Left<string>('package.json has no version');

const _parseJson = (raw: string, source: string): Either.Either<string, unknown> =>
  Either.tryCatch(
    (): unknown => JSON.parse(raw),
    (e) => `Could not parse ${source}: ${(e as Error).message}`
  );

const _pack = (deps: ReleaseDeps, from: string, dest: string): EitherAsync.EitherAsync<string, string> =>
  pipe(
    // Scripts off: `prepare` (husky) would otherwise print ahead of the JSON.
    deps.run('pnpm', ['pack', '--json', '--pack-destination', dest, '--config.ignore-scripts=true'], from),
    EitherAsync.chain((raw: string) => EitherAsync.liftEither(parsePackFilename(raw)))
  );

const _rewriteManifest = (deps: ReleaseDeps, pkgDir: string): EitherAsync.EitherAsync<string, void> =>
  pipe(
    deps.readText(`${pkgDir}/package.json`),
    EitherAsync.chain((raw: string) => EitherAsync.liftEither(Either.chain(toCommercialManifest)(_parseJson(raw, 'package.json')))),
    EitherAsync.chain((m: Json) => deps.writeText(`${pkgDir}/package.json`, `${JSON.stringify(m, null, 2)}\n`))
  );

const _swapLicense = (deps: ReleaseDeps, root: string, pkgDir: string): EitherAsync.EitherAsync<string, void> =>
  deps.exists(`${root}/COMMERCIAL-LICENSE.md`)
    ? EitherAsync.chain((text: string) => deps.writeText(`${pkgDir}/LICENSE`, text))(deps.readText(`${root}/COMMERCIAL-LICENSE.md`))
    : EitherAsync.left(`COMMERCIAL-LICENSE.md not found in ${root}`);

/** Pack `root`, rewrite the unpacked copy as the commercial package, and pack that. Right(tarball path). */
export const buildCommercialTarball =
  (deps: ReleaseDeps) =>
  (root: string, dir: string): EitherAsync.EitherAsync<string, string> =>
    pipe(
      _pack(deps, root, dir),
      EitherAsync.chain((tarball: string) => deps.run('tar', ['-xzf', tarball, '-C', dir], dir)),
      EitherAsync.chain(() => _swapLicense(deps, root, `${dir}/package`)),
      EitherAsync.chain(() => _rewriteManifest(deps, `${dir}/package`)),
      EitherAsync.chain(() => _pack(deps, `${dir}/package`, dir))
    );

const _listFiles = (deps: ReleaseDeps, tarball: string, dir: string): EitherAsync.EitherAsync<string, readonly string[]> =>
  EitherAsync.map((out: string): readonly string[] => out.split('\n').filter((line) => line !== ''))(deps.run('tar', ['-tzf', tarball], dir));

const _publish = (deps: ReleaseDeps, tarball: string, dir: string, publish: boolean): EitherAsync.EitherAsync<string, boolean> =>
  publish ? EitherAsync.map((): boolean => true)(deps.run('npm', ['publish', tarball, '--registry', GITHUB_PACKAGES], dir)) : EitherAsync.right(false);

const _report =
  (tarball: string, smoke: SmokeReport, files: readonly string[]) =>
  (published: boolean): CommercialReport => ({ name: smoke.name, version: smoke.version, tarball, files, published });

const _checkAndPublish =
  (deps: ReleaseDeps, dir: string, publish: boolean) =>
  (tarball: string): EitherAsync.EitherAsync<string, CommercialReport> =>
    pipe(
      smokeTestTarball(deps)(tarball, `${dir}/smoke`, COMMERCIAL_NAME),
      EitherAsync.chain((smoke: SmokeReport) =>
        EitherAsync.chain((files: readonly string[]) => EitherAsync.map(_report(tarball, smoke, files))(_publish(deps, tarball, dir, publish)))(_listFiles(deps, tarball, dir))
      )
    );

/** Build and smoke-test the commercial tarball; publish it to GitHub Packages only when `publish` is true. */
export const publishCommercial =
  (deps: ReleaseDeps) =>
  (root: string, publish: boolean): EitherAsync.EitherAsync<string, CommercialReport> =>
    pipe(
      deps.makeTempDir('elevate-ts-commercial-'),
      EitherAsync.chain((dir: string) => EitherAsync.chain(_checkAndPublish(deps, dir, publish))(buildCommercialTarball(deps)(root, dir)))
    );
