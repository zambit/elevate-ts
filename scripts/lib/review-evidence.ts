// Gathers the evidence for a human release review from a tarball, the npm
// registry and the repo. Side effects are injected (ReleaseDeps) for testing.
// npm is used only for registry queries pnpm has no equivalent for.

import * as Either from '../../src/Either.js';
import * as EitherAsync from '../../src/EitherAsync.js';
import { pipe } from '../../src/Function.js';

import type { ReleaseDeps } from './release.js';
import { changelogEntry, diffFiles, lineDiff, parsePackFiles, parseVersions, previousVersion, suspiciousFiles, tarballFiles, type FileDiff } from './review.js';
import { explainNpmError, parseStageItems, type StageItem } from './stage.js';

export type PreviousRelease = { readonly version: string; readonly files: FileDiff; readonly readmeDiff: readonly string[] };

export type Evidence = {
  readonly tarball: string;
  readonly packageName: string;
  readonly version: string;
  readonly shasum: string;
  /** The staged entry, or a Left explaining why it could not be found. */
  readonly staged: Either.Either<string, StageItem>;
  readonly files: readonly string[];
  readonly suspicious: readonly string[];
  /** Comparison with the previous published version, or why it is unavailable. */
  readonly previous: Either.Either<string, PreviousRelease>;
  readonly changelog: Either.Either<string, string>;
};

type Manifest = { readonly name: string; readonly version: string };

const _isManifest = (u: unknown): u is Manifest => typeof u === 'object' && u !== null && typeof (u as Manifest).name === 'string' && typeof (u as Manifest).version === 'string';

const _parseManifest = (raw: string): Either.Either<string, Manifest> =>
  Either.chain((json: unknown) => (_isManifest(json) ? Either.Right(json) : Either.Left<string>('Tarball package.json has no name/version')))(
    Either.tryCatch(
      (): unknown => JSON.parse(raw),
      (e) => `Could not parse the tarball's package.json: ${(e as Error).message}`
    )
  );

/** Run optional evidence to completion: its Left becomes a value, so it cannot abort the review. */
const _settle = <A>(ea: EitherAsync.EitherAsync<string, A>): Promise<Either.Either<string, A>> => ea.run();

const _readFromTarball = (deps: ReleaseDeps, tarball: string, file: string, cwd: string): EitherAsync.EitherAsync<string, string> => deps.run('tar', ['-xOzf', tarball, `package/${file}`], cwd);

const _findStaged = (deps: ReleaseDeps, m: Manifest, shasum: string, cwd: string): EitherAsync.EitherAsync<string, StageItem> =>
  pipe(
    deps.run('npm', ['stage', 'list', m.name, '--json'], cwd),
    EitherAsync.mapLeft(explainNpmError),
    EitherAsync.chain((raw: string) => EitherAsync.liftEither(parseStageItems(raw))),
    EitherAsync.chain((items) => {
      const match = items.find((i) => i.packageName === m.name && i.shasum === shasum);
      return match === undefined ? EitherAsync.left(`Not staged on npm (no staged entry with shasum ${shasum})`) : EitherAsync.right(match);
    })
  );

const _previous = (deps: ReleaseDeps, m: Manifest, files: readonly string[], tarball: string, cwd: string): EitherAsync.EitherAsync<string, PreviousRelease> =>
  pipe(
    deps.run('npm', ['view', m.name, 'versions', '--json'], cwd),
    EitherAsync.mapLeft(explainNpmError),
    EitherAsync.chain((raw: string) => EitherAsync.liftEither(Either.chain((vs: readonly string[]) => previousVersion(vs, m.version))(parseVersions(raw)))),
    EitherAsync.chain((prev) =>
      pipe(
        deps.run('npm', ['pack', `${m.name}@${prev}`, '--dry-run', '--json'], cwd),
        EitherAsync.chain((raw) => EitherAsync.liftEither(parsePackFiles(raw))),
        EitherAsync.chain((prevFiles) =>
          EitherAsync.map<string, readonly string[], PreviousRelease>((diff) => ({ version: prev, files: diffFiles(prevFiles, files), readmeDiff: diff }))(_readmeDiff(deps, m, prev, tarball, cwd))
        )
      )
    )
  );

const _readmeDiff = (deps: ReleaseDeps, m: Manifest, prev: string, tarball: string, cwd: string): EitherAsync.EitherAsync<string, readonly string[]> =>
  pipe(
    deps.run('npm', ['view', `${m.name}@${prev}`, 'readme'], cwd),
    EitherAsync.chain((before: string) => EitherAsync.map<string, string, readonly string[]>((after) => lineDiff(before.trimEnd(), after.trimEnd()))(_readFromTarball(deps, tarball, 'README.md', cwd)))
  );

const _changelog = (deps: ReleaseDeps, repoRoot: string, version: string): EitherAsync.EitherAsync<string, string> =>
  pipe(
    deps.readText(`${repoRoot}/CHANGELOG.md`),
    EitherAsync.chain((text) => EitherAsync.liftEither(changelogEntry(text, version)))
  );

type Core = { readonly shasum: string; readonly files: readonly string[]; readonly manifest: Manifest };

const _manifest = (deps: ReleaseDeps, tarball: string, cwd: string): EitherAsync.EitherAsync<string, Manifest> =>
  pipe(
    _readFromTarball(deps, tarball, 'package.json', cwd),
    EitherAsync.chain((raw: string) => EitherAsync.liftEither(_parseManifest(raw)))
  );

const _core = (deps: ReleaseDeps, tarball: string, cwd: string): EitherAsync.EitherAsync<string, Core> =>
  pipe(
    deps.sha1File(tarball),
    EitherAsync.chain((shasum: string) => EitherAsync.map<string, string, Omit<Core, 'manifest'>>((raw) => ({ shasum, files: tarballFiles(raw) }))(deps.run('tar', ['-tzf', tarball], cwd))),
    EitherAsync.chain((c: Omit<Core, 'manifest'>) => EitherAsync.map<string, Manifest, Core>((manifest) => ({ ...c, manifest }))(_manifest(deps, tarball, cwd)))
  );

type Optional = {
  readonly staged: Either.Either<string, StageItem>;
  readonly previous: Either.Either<string, PreviousRelease>;
  readonly changelog: Either.Either<string, string>;
};

const _optional = async (deps: ReleaseDeps, c: Core, tarball: string, repoRoot: string, staged: StageItem | undefined): Promise<Optional> => ({
  staged: staged === undefined ? await _settle(_findStaged(deps, c.manifest, c.shasum, repoRoot)) : Either.Right(staged),
  previous: await _settle(_previous(deps, c.manifest, c.files, tarball, repoRoot)),
  changelog: await _settle(_changelog(deps, repoRoot, c.manifest.version))
});

const _evidence = (tarball: string, c: Core, o: Optional): Evidence => ({
  tarball,
  packageName: c.manifest.name,
  version: c.manifest.version,
  shasum: c.shasum,
  files: c.files,
  suspicious: suspiciousFiles(c.files),
  ...o
});

/**
 * Gather review evidence for `tarball`. Fails only if the tarball itself cannot be
 * read; registry and changelog lookups degrade to explanations.
 * Pass `staged` when the caller already knows the staged entry (verify-staged).
 */
export const gatherEvidence =
  (deps: ReleaseDeps) =>
  (tarball: string, repoRoot: string, staged?: StageItem): EitherAsync.EitherAsync<string, Evidence> =>
    EitherAsync.chain<string, Core, Evidence>((c) => EitherAsync.EitherAsync(async () => Either.Right<Evidence>(_evidence(tarball, c, await _optional(deps, c, tarball, repoRoot, staged)))))(
      _core(deps, tarball, repoRoot)
    );
