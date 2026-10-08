// Shared terminal output for release-check commands.

import { GITHUB_PACKAGES, type CommercialReport } from '../../lib/commercial.js';
import type { StagedReport } from '../../lib/release.js';
import type { SmokeReport } from '../../lib/smoke.js';

export const smokeLine = (r: SmokeReport): string => `[release-check] smoke OK: ${r.name}@${r.version}, ${r.entryPoints} entry points load under ESM and CJS`;

export const commercialReport = (r: CommercialReport): string =>
  [
    `[release-check] commercial ${r.published ? 'published' : 'built'}: ${r.name}@${r.version}`,
    `  registry:   ${GITHUB_PACKAGES}`,
    `  tarball:    ${r.tarball}`,
    `  files:      ${r.files.length}`,
    '  smoke test: every entry point loads under ESM and CJS',
    ...(r.published ? [] : ['', 'Dry run: nothing was published. CI publishes with --publish after the commercial environment is approved.'])
  ].join('\n');

export const fail = (message: string): void => {
  console.error(`[release-check] FAIL: ${message}`);
  process.exitCode = 1;
};

export const stagedReport = (r: StagedReport, reviewNext: boolean): string =>
  [
    `[release-check] verify OK: ${r.item.packageName}@${r.item.version}`,
    `  stage id:   ${r.item.id}`,
    `  dist-tag:   ${r.item.tag}`,
    `  shasum:     ${r.item.shasum} (matches download)`,
    `  smoke test: ${r.smoke.entryPoints} entry points load under ESM and CJS`,
    `  tarball:    ${r.tarball}`,
    '',
    ...(reviewNext
      ? ['Starting the human review...']
      : ['Next, the guided human review:', '', `  pnpm release-check review ${r.tarball}`, '', 'Then approve (prompts for 2FA):', '', `  npm stage approve ${r.item.id}`])
  ].join('\n');
