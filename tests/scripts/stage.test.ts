import { describe, it, expect } from 'vitest';

import { checkShasum, findStaged, parseStageItems, stagedTarballName, type StageItem } from '../../scripts/lib/stage.js';

const item = (over: Partial<StageItem> = {}): StageItem => ({
  id: '11111111-2222-3333-4444-555555555555',
  packageName: '@zambit/elevate-ts',
  version: '0.9.0',
  tag: 'latest',
  shasum: 'abc123',
  ...over
});

describe('parseStageItems', () => {
  it('parses an array of staged items, ignoring extra fields', () => {
    const raw = JSON.stringify([{ ...item(), createdAt: '2026-10-05', actor: 'ci', actorType: 'oidc' }]);
    const result = parseStageItems(raw);
    expect(result.tag).toBe('Right');
    expect(result.tag === 'Right' && result.right[0]?.id).toBe(item().id);
  });

  it('accepts an empty list', () => {
    expect(parseStageItems('[]')).toMatchObject({ tag: 'Right', right: [] });
  });

  it('returns Left for invalid JSON', () => {
    const result = parseStageItems('not json');
    expect(result.tag === 'Left' && result.left).toMatch(/Could not parse/);
  });

  it('returns Left when an item is missing a field', () => {
    const { shasum: _omit, ...partial } = item();
    const result = parseStageItems(JSON.stringify([partial]));
    expect(result.tag === 'Left' && result.left).toMatch(/expected an array of staged items/);
  });

  it('returns Left when the JSON is not an array', () => {
    expect(parseStageItems('{"items":[]}').tag).toBe('Left');
  });
});

describe('findStaged', () => {
  const find = findStaged('@zambit/elevate-ts', '0.9.0');

  it('returns the single matching item', () => {
    const other = item({ version: '0.8.1', id: 'other' });
    expect(find([other, item()])).toMatchObject({ tag: 'Right', right: { id: item().id } });
  });

  it('returns Left when nothing matches', () => {
    const result = find([item({ version: '0.8.1' }), item({ packageName: '@zambit/other' })]);
    expect(result.tag === 'Left' && result.left).toMatch(/No staged version @zambit\/elevate-ts@0.9.0/);
  });

  it('returns Left listing every id when several entries match', () => {
    const result = find([item({ id: 'a', tag: 'latest' }), item({ id: 'b', tag: 'next' })]);
    expect(result.tag === 'Left' && result.left).toMatch(/a \(tag latest\), b \(tag next\)/);
  });
});

describe('stagedTarballName', () => {
  it('matches the filename npm stage download writes', () => {
    expect(stagedTarballName(item())).toBe('zambit-elevate-ts-0.9.0-11111111-2222-3333-4444-555555555555.tgz');
  });

  it('handles unscoped package names', () => {
    expect(stagedTarballName(item({ packageName: 'plain', id: 'x' }))).toBe('plain-0.9.0-x.tgz');
  });
});

describe('checkShasum', () => {
  it('returns Right when the digest matches', () => {
    expect(checkShasum(item())('abc123')).toMatchObject({ tag: 'Right', right: 'abc123' });
  });

  it('returns Left naming both digests on mismatch', () => {
    const result = checkShasum(item())('def456');
    expect(result.tag === 'Left' && result.left).toBe('Shasum mismatch: registry has abc123, downloaded tarball is def456');
  });
});
