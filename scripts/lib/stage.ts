// Pure helpers for npm staged publishing (`npm stage list` / `npm stage download`).
// Field names mirror the registry's /-/stage response as printed by npm's
// `logStageItem` (npm 11.17+).

import * as Either from '../../src/Either.js';

/** One entry from `npm stage list --json`. */
export type StageItem = {
  readonly id: string;
  readonly packageName: string;
  readonly version: string;
  readonly tag: string;
  readonly shasum: string;
};

const _isRecord = (u: unknown): u is Record<string, unknown> => typeof u === 'object' && u !== null;

const _STAGE_FIELDS = ['id', 'packageName', 'version', 'tag', 'shasum'] as const;

const _isStageItem = (u: unknown): u is StageItem => _isRecord(u) && _STAGE_FIELDS.every((k) => typeof u[k] === 'string');

/** Parse the JSON printed by `npm stage list --json`. */
export const parseStageItems = (raw: string): Either.Either<string, readonly StageItem[]> =>
  Either.chain((json: unknown) =>
    Array.isArray(json) && json.every(_isStageItem) ? Either.Right(json as readonly StageItem[]) : Either.Left<string>('Unexpected `npm stage list --json` output: expected an array of staged items')
  )(
    Either.tryCatch(
      (): unknown => JSON.parse(raw),
      (e) => `Could not parse \`npm stage list --json\` output: ${(e as Error).message}`
    )
  );

const _describe = (items: readonly StageItem[]): string => items.map((i) => `${i.id} (tag ${i.tag})`).join(', ');

/** Select the single staged item for a package version. */
export const findStaged =
  (packageName: string, version: string) =>
  (items: readonly StageItem[]): Either.Either<string, StageItem> => {
    const matches = items.filter((i) => i.packageName === packageName && i.version === version);
    if (matches.length === 1) return Either.Right(matches[0] as StageItem);
    return matches.length === 0
      ? Either.Left(`No staged version ${packageName}@${version}. Has CI finished staging it?`)
      : Either.Left(`Several staged entries for ${packageName}@${version}: ${_describe(matches)}. Reject the extras first.`);
  };

/** Filename `npm stage download <id>` writes into the current directory. */
export const stagedTarballName = (item: StageItem): string => `${item.packageName.replace('@', '').replace('/', '-')}-${item.version}-${item.id}.tgz`;

/** Compare a downloaded tarball's sha1 against the registry's recorded shasum. */
export const checkShasum =
  (item: StageItem) =>
  (actual: string): Either.Either<string, string> =>
    actual === item.shasum ? Either.Right(actual) : Either.Left(`Shasum mismatch: registry has ${item.shasum}, downloaded tarball is ${actual}`);
