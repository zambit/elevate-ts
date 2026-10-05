// Release checks: smoke-test a freshly packed tarball (CI, before staging) and
// verify a staged tarball on npm (maintainer, before `npm stage approve`).

import * as Either from '../../src/Either.js';
import * as EitherAsync from '../../src/EitherAsync.js';
import { pipe } from '../../src/Function.js';

import { smokeTestTarball, type SmokeDeps, type SmokeReport } from './smoke.js';
import { checkShasum, findStaged, parseStageItems, stagedTarballName, type StageItem } from './stage.js';

export type ReleaseDeps = SmokeDeps & {
  readonly makeTempDir: (prefix: string) => EitherAsync.EitherAsync<string, string>;
  readonly sha1File: (file: string) => EitherAsync.EitherAsync<string, string>;
};

export type StagedReport = { readonly item: StageItem; readonly tarball: string; readonly smoke: SmokeReport };

const _isPackResult = (u: unknown): u is { filename: string } => typeof u === 'object' && u !== null && typeof (u as { filename?: unknown }).filename === 'string';

/** Absolute tarball path from `pnpm pack --json` output (a single object, not an array). */
export const parsePackFilename = (raw: string): Either.Either<string, string> =>
  Either.chain((json: unknown) => (_isPackResult(json) ? Either.Right(json.filename) : Either.Left<string>('Unexpected `pnpm pack --json` output: expected an object with a filename')))(
    Either.tryCatch(
      (): unknown => JSON.parse(raw),
      (e) => `Could not parse \`pnpm pack --json\` output: ${(e as Error).message}`
    )
  );

/** Pack the package at `root` and smoke-test the tarball. */
export const packAndSmoke =
  (deps: ReleaseDeps) =>
  (root: string, packageName: string): EitherAsync.EitherAsync<string, SmokeReport> =>
    pipe(
      deps.makeTempDir('elevate-ts-pack-'),
      EitherAsync.chain((dir) =>
        pipe(
          // Scripts off: `prepare` (husky) would otherwise print ahead of the JSON.
          deps.run('pnpm', ['pack', '--json', '--pack-destination', dir, '--config.ignore-scripts=true'], root),
          EitherAsync.chain((raw) => EitherAsync.liftEither(parsePackFilename(raw))),
          EitherAsync.chain((tarball) => smokeTestTarball(deps)(tarball, dir, packageName))
        )
      )
    );

const _findStagedItem =
  (deps: ReleaseDeps, dir: string) =>
  (packageName: string, version: string): EitherAsync.EitherAsync<string, StageItem> =>
    pipe(
      deps.run('npm', ['stage', 'list', packageName, '--json'], dir),
      EitherAsync.chain((raw) => EitherAsync.liftEither(Either.chain(findStaged(packageName, version))(parseStageItems(raw))))
    );

const _downloadVerified =
  (deps: ReleaseDeps, dir: string) =>
  (item: StageItem): EitherAsync.EitherAsync<string, string> =>
    pipe(
      deps.run('npm', ['stage', 'download', item.id], dir),
      EitherAsync.chain(() => deps.sha1File(`${dir}/${stagedTarballName(item)}`)),
      EitherAsync.chain((sha) => EitherAsync.liftEither(checkShasum(item)(sha))),
      EitherAsync.map(() => `${dir}/${stagedTarballName(item)}`)
    );

const _verifyIn =
  (deps: ReleaseDeps, dir: string) =>
  (item: StageItem): EitherAsync.EitherAsync<string, StagedReport> =>
    pipe(
      _downloadVerified(deps, dir)(item),
      EitherAsync.chain((tarball: string) => EitherAsync.map<string, SmokeReport, StagedReport>((smoke) => ({ item, tarball, smoke }))(smokeTestTarball(deps)(tarball, dir, item.packageName)))
    );

/** Find, download, shasum-check and smoke-test the staged `packageName@version`. */
export const verifyStaged =
  (deps: ReleaseDeps) =>
  (packageName: string, version: string): EitherAsync.EitherAsync<string, StagedReport> =>
    pipe(
      deps.makeTempDir('elevate-ts-staged-'),
      EitherAsync.chain((dir) => EitherAsync.chain(_verifyIn(deps, dir))(_findStagedItem(deps, dir)(packageName, version)))
    );
