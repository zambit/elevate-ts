// Pure helpers for the human release review (`pnpm review-tarball`).
// Each turns raw command output into evidence a reviewer can judge quickly.

import * as Either from '../../src/Either.js';

/** Files in a tarball listing (`tar -tzf`), without npm's `package/` prefix or directory entries. */
export const tarballFiles = (raw: string): readonly string[] =>
  raw
    .split('\n')
    .map((line) => line.trim().replace(/^package\//, ''))
    .filter((path) => path !== '' && !path.endsWith('/'))
    .sort();

const _SUSPICIOUS: readonly RegExp[] = [
  /(^|\/)\.env(\.|$)/,
  /(^|\/)\.DS_Store$/,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /(^|\/)(tests?|__tests__|coverage|reviews|locals|\.claude|\.github|\.changeset)\//,
  /\.dontkeep\.md$/,
  /\.(tgz|log)$/
];

/** Files that usually should not ship in a package. */
export const suspiciousFiles = (files: readonly string[]): readonly string[] => files.filter((f) => _SUSPICIOUS.some((re) => re.test(f)));

export type FileDiff = { readonly added: readonly string[]; readonly removed: readonly string[] };

/** Files added and removed relative to the previous release. */
export const diffFiles = (previous: readonly string[], next: readonly string[]): FileDiff => {
  const prev = new Set(previous);
  const nxt = new Set(next);
  return { added: next.filter((f) => !prev.has(f)), removed: previous.filter((f) => !nxt.has(f)) };
};

type Semver = readonly [number, number, number, string];

const _parseSemver = (v: string): Semver | undefined => {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(v);
  return m === null ? undefined : [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ?? ''];
};

/** Compare two parsed versions; a pre-release sorts before its release. */
const _compare = (a: Semver, b: Semver): number => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || (a[3] === b[3] ? 0 : a[3] === '' ? 1 : b[3] === '' ? -1 : a[3] < b[3] ? -1 : 1);

/** The highest published version below `version`, to compare against. */
export const previousVersion = (published: readonly string[], version: string): Either.Either<string, string> => {
  const target = _parseSemver(version);
  if (target === undefined) return Either.Left(`Not a semver version: ${version}`);
  const lower = published.filter((v) => {
    const p = _parseSemver(v);
    return p !== undefined && _compare(p, target) < 0;
  });
  const best = lower.reduce<string | undefined>((acc, v) => (acc === undefined || _compare(_parseSemver(v) as Semver, _parseSemver(acc) as Semver) > 0 ? v : acc), undefined);
  return best === undefined ? Either.Left(`No published version below ${version}`) : Either.Right(best);
};

/** Parse `npm view <pkg> versions --json`, which prints a bare string when only one version exists. */
export const parseVersions = (raw: string): Either.Either<string, readonly string[]> =>
  Either.chain((json: unknown) =>
    typeof json === 'string'
      ? Either.Right<readonly string[]>([json])
      : Array.isArray(json) && json.every((v) => typeof v === 'string')
        ? Either.Right<readonly string[]>(json)
        : Either.Left<string>('Unexpected `npm view versions --json` output')
  )(
    Either.tryCatch(
      (): unknown => JSON.parse(raw),
      (e) => `Could not parse \`npm view versions --json\` output: ${(e as Error).message}`
    )
  );

const _isFileEntry = (u: unknown): u is { path: string } => typeof u === 'object' && u !== null && typeof (u as { path?: unknown }).path === 'string';

/** File paths from `npm pack <spec> --dry-run --json`. */
export const parsePackFiles = (raw: string): Either.Either<string, readonly string[]> =>
  Either.chain((json: unknown) => {
    const files: unknown = Array.isArray(json) ? (json[0] as { files?: unknown } | undefined)?.files : undefined;
    return Array.isArray(files) && files.every(_isFileEntry) ? Either.Right<readonly string[]>(files.map((f) => f.path).sort()) : Either.Left<string>('Unexpected `npm pack --dry-run --json` output');
  })(
    Either.tryCatch(
      (): unknown => JSON.parse(raw),
      (e) => `Could not parse \`npm pack --dry-run --json\` output: ${(e as Error).message}`
    )
  );

/** The body of `## <version>` in CHANGELOG.md, up to the next `## ` heading. */
export const changelogEntry = (changelog: string, version: string): Either.Either<string, string> => {
  const lines = changelog.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start === -1) return Either.Left(`CHANGELOG.md has no "## ${version}" entry`);
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return Either.Right(
    lines
      .slice(start + 1, end === -1 ? undefined : end)
      .join('\n')
      .trim()
  );
};

/** Warnings about the dist-tag a version is staged with. */
export const tagWarnings = (version: string, tag: string): readonly string[] => {
  const prerelease = version.includes('-');
  if (prerelease && tag === 'latest') return [`${version} is a pre-release but is tagged "latest"; installs would get it by default.`];
  if (!prerelease && tag !== 'latest') return [`${version} is a normal release but is tagged "${tag}", not "latest".`];
  return [];
};

/** Line diff (`- old`, `+ new`) via longest common subsequence. Empty when equal. */
export const lineDiff = (before: string, after: string): readonly string[] => {
  const a = before.split('\n');
  const b = after.split('\n');
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) (lcs[i] as number[])[j] = a[i] === b[j] ? (lcs[i + 1]?.[j + 1] ?? 0) + 1 : Math.max(lcs[i + 1]?.[j] ?? 0, lcs[i]?.[j + 1] ?? 0);
  return _walk(a, b, lcs);
};

const _walk = (a: readonly string[], b: readonly string[], lcs: readonly (readonly number[])[]): readonly string[] => {
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    // On a tie, emit the removal first, as unified diffs do.
    if (i < a.length && j < b.length && a[i] === b[j]) [i, j] = [i + 1, j + 1];
    else if (i < a.length && (j >= b.length || (lcs[i + 1]?.[j] ?? 0) >= (lcs[i]?.[j + 1] ?? 0))) out.push(`- ${a[i++]}`);
    else out.push(`+ ${b[j++]}`);
  }
  return out;
};

export type Verdict = 'pass' | 'fail' | 'skip';

export type CheckResult = { readonly title: string; readonly verdict: Verdict; readonly note: string; readonly findings: readonly string[] };

export type ReviewMeta = {
  readonly packageName: string;
  readonly version: string;
  readonly stageId: string;
  readonly tag: string;
  readonly shasum: string;
  readonly reviewer: string;
  readonly date: string;
};

/** Overall outcome: failed if any check failed, otherwise passed. (Approving on npm is a separate, manual step.) */
export const outcome = (results: readonly CheckResult[]): 'passed' | 'failed' => (results.some((r) => r.verdict === 'fail') ? 'failed' : 'passed');

const _resultBlock = (r: CheckResult): string =>
  [`### ${r.title}`, '', `- **Verdict:** ${r.verdict}`, ...(r.note === '' ? [] : [`- **Note:** ${r.note}`]), ...r.findings.map((f) => `- ${f}`), ''].join('\n');

/** Markdown record of a review, for `reviews/releases/<version>.md`. */
export const renderRecord = (meta: ReviewMeta, results: readonly CheckResult[]): string =>
  [
    `# Release Review: ${meta.packageName}@${meta.version}`,
    '',
    `- **Outcome:** ${outcome(results)}`,
    `- **Reviewer:** ${meta.reviewer}`,
    `- **Date:** ${meta.date}`,
    `- **Stage id:** ${meta.stageId}`,
    `- **Dist-tag:** ${meta.tag}`,
    `- **Shasum:** ${meta.shasum}`,
    '',
    '## Checks',
    '',
    ...results.map(_resultBlock)
  ].join('\n');
