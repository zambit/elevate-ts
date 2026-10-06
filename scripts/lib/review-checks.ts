// The human checks, built from gathered evidence. Pure: each check is the text a
// reviewer sees (facts, warnings, an optional longer view) plus the question.

import type { Evidence } from './review-evidence.js';
import { tagWarnings } from './review.js';

export type CheckSpec = {
  readonly title: string;
  /** What to verify, in one sentence. */
  readonly question: string;
  readonly facts: readonly string[];
  /** Problems found automatically; the reviewer decides whether they block. */
  readonly warnings: readonly string[];
  /** Extra lines shown only if the reviewer asks to view more. */
  readonly more: readonly string[];
  /** Short facts recorded in the review file. */
  readonly findings: readonly string[];
};

const PREVIEW = 40;

const _list = (label: string, items: readonly string[], max: number): readonly string[] =>
  items.length === 0 ? [] : [`${label} (${items.length}):`, ...items.slice(0, max).map((i) => `  ${i}`), ...(items.length > max ? [`  ... ${items.length - max} more`] : [])];

export const distTagCheck = (e: Evidence): CheckSpec =>
  e.staged.tag === 'Right'
    ? {
        title: 'Dist-tag',
        question: 'Is this the dist-tag the release should go out under?',
        facts: [`Staged as ${e.staged.right.id}`, `Dist-tag: ${e.staged.right.tag}`],
        warnings: tagWarnings(e.version, e.staged.right.tag),
        more: [],
        findings: [`dist-tag ${e.staged.right.tag}`]
      }
    : {
        title: 'Dist-tag',
        question: 'The dist-tag could not be confirmed. Skip unless you have checked it another way.',
        facts: [e.staged.left],
        warnings: ['Could not confirm the staged dist-tag.'],
        more: [],
        findings: ['dist-tag not confirmed']
      };

export const filesCheck = (e: Evidence): CheckSpec => {
  const prev = e.previous.tag === 'Right' ? e.previous.right : undefined;
  const noComparison = e.previous.tag === 'Left' ? `No comparison: ${e.previous.left}` : '';
  const changes = prev === undefined ? [] : [..._list(`Added since ${prev.version}`, prev.files.added, 20), ..._list(`Removed since ${prev.version}`, prev.files.removed, 20)];
  return {
    title: 'Files',
    question: 'Does the package contain exactly what should ship?',
    facts: [`${e.files.length} files`, ...(prev === undefined ? [noComparison] : changes.length === 0 ? [`Same file list as ${prev.version}`] : changes)],
    warnings: e.suspicious.length === 0 ? [] : [`Files that usually should not ship: ${e.suspicious.join(', ')}`],
    more: ['All files:', ...e.files.map((f) => `  ${f}`)],
    findings: [
      `${e.files.length} files`,
      ...(prev === undefined ? [] : [`+${prev.files.added.length} / -${prev.files.removed.length} vs ${prev.version}`]),
      ...(e.suspicious.length === 0 ? [] : [`suspicious: ${e.suspicious.join(', ')}`])
    ]
  };
};

export const changelogCheck = (e: Evidence): CheckSpec =>
  e.changelog.tag === 'Right'
    ? {
        title: 'Version and changelog',
        question: `Does the CHANGELOG entry for ${e.version} describe what is shipping?`,
        facts: [`Tarball version: ${e.version}`, `CHANGELOG.md entry for ${e.version}:`, ...e.changelog.right.split('\n').map((l) => `  ${l}`)],
        warnings: [],
        more: [],
        findings: [`version ${e.version}`, 'changelog entry present']
      }
    : {
        title: 'Version and changelog',
        question: `There is no CHANGELOG entry for ${e.version}. Fail unless that is intended.`,
        facts: [`Tarball version: ${e.version}`],
        warnings: [e.changelog.left],
        more: [],
        findings: [`version ${e.version}`, 'changelog entry missing']
      };

export const readmeCheck = (e: Evidence): CheckSpec => {
  if (e.previous.tag === 'Left') {
    return { title: 'README', question: 'Check README.md in the tarball by hand (no previous version to compare).', facts: [e.previous.left], warnings: [], more: [], findings: ['no comparison'] };
  }
  const { version, readmeDiff } = e.previous.right;
  return {
    title: 'README',
    question: 'The README becomes the npm package page. Do these changes read correctly?',
    facts: readmeDiff.length === 0 ? [`README unchanged since ${version}`] : [`README changes since ${version} (${readmeDiff.length} lines):`, ...readmeDiff.slice(0, PREVIEW).map((l) => `  ${l}`)],
    warnings: [],
    more: readmeDiff.length > PREVIEW ? readmeDiff.slice(PREVIEW).map((l) => `  ${l}`) : [],
    findings: [readmeDiff.length === 0 ? `unchanged since ${version}` : `${readmeDiff.length} changed lines since ${version}`]
  };
};

/** The checks that work from evidence alone, in order. The real-code trial is interactive and handled by the session. */
export const evidenceChecks = (e: Evidence): readonly CheckSpec[] => [distTagCheck(e), filesCheck(e), changelogCheck(e), readmeCheck(e)];
