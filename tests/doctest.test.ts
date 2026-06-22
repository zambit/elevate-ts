// Doctest extractor — runs every `@example` block in the pilot source files so the
// usage docs can't silently rot. Guarantee: each example compiles (type-stripped by
// vitest/esbuild) and executes without throwing, catching the real failure modes —
// renamed/removed exports, changed import paths, and runtime errors. It does NOT assert
// the `// =>` comment values; that is a documented rollout enhancement, not pilot scope.
import { describe, it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Pilot scope: Codec only. At rollout, extend this list with more module paths.
const SOURCES: readonly string[] = ['src/Codec.ts'];

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = resolve(ROOT, 'tests/.doctest');

// Matches a TSDoc `@example` followed by a fenced ```ts block; group 1 is the raw code.
const EXAMPLE_RE = /@example[\s\S]*?```ts\r?\n([\s\S]*?)\r?\n[ \t]*\*[ \t]*```/g;

type Example = { readonly name: string; readonly code: string };

// Strip the leading ` * ` comment prefix from each line, preserving relative indentation.
const dedentComment = (block: string): string =>
  block
    .split('\n')
    .map((line) => line.replace(/^[ \t]*\*[ \t]?/, ''))
    .join('\n');

// The exported symbol that follows an example, used to label the test.
const symbolAfter = (source: string, from: number): string => source.slice(from).match(/export const (\w+)/)?.[1] ?? 'example';

const extractExamples = (source: string): readonly Example[] =>
  [...source.matchAll(EXAMPLE_RE)].map((m) => ({
    name: symbolAfter(source, m.index ?? 0),
    code: dedentComment(m[1] ?? '')
  }));

const runExample = async (name: string, index: number, code: string): Promise<void> => {
  const file = join(TMP, `${name}-${index}.ts`);
  writeFileSync(file, code);
  await import(pathToFileURL(file).href);
};

mkdirSync(TMP, { recursive: true });

SOURCES.forEach((relPath) => {
  const examples = extractExamples(readFileSync(resolve(ROOT, relPath), 'utf8'));
  describe(`@example blocks in ${relPath}`, () => {
    examples.forEach((ex, i) => it(`${ex.name} example #${i} runs without throwing`, () => runExample(ex.name, i, ex.code)));
  });
});
