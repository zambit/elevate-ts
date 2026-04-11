/* eslint-disable no-console */
/**
 * Design Token CSS Generator
 *
 * Shared generator for all samples. Reads the workspace token configuration
 * and generates immutable CSS variables for each sample.
 *
 * Usage (from workspace root):
 *   npx tsx src/tokens/generateCSS.ts
 *   OR with npm script:
 *   npm run generate:tokens
 *
 * Generates CSS files in:
 *   samples/spa-examples/[name]/src/styles/tokens.css
 *   samples/worker-examples/[name]/src/styles/tokens.css
 *   samples/fullstack-examples/[name]/src/styles/tokens.css
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

import { glob } from 'glob';

import { tokenConfig } from './config.js';
import { generateCSS } from './cssGen.js';

/**
 * Find all sample directories that need tokens generated.
 */
async function findSampleDirs(): Promise<string[]> {
  const patterns = ['samples/spa-examples/*/src/styles', 'samples/worker-examples/*/src/styles', 'samples/fullstack-examples/*/src/styles'];

  const dirs = new Set<string>();

  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern, { cwd: process.cwd() });
      matches.forEach((dir) => dirs.add(dir));
    } catch {
      // Pattern may not have matches yet, that's OK
    }
  }

  return Array.from(dirs).sort();
}

/**
 * Main function: generate and write CSS file to each sample.
 */
async function main() {
  try {
    const css = generateCSS();
    const sampleDirs = await findSampleDirs();

    if (sampleDirs.length === 0) {
      console.log('⚠ No sample directories found. Create samples and run again.');
      return;
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const sampleDir of sampleDirs) {
      try {
        const outputPath = resolve(sampleDir, 'tokens.css');
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, css, 'utf-8');
        console.log(`✓ ${sampleDir}/tokens.css`);
        successCount++;
      } catch (error) {
        errors.push(`✗ ${sampleDir}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('');
    console.log(`Generated tokens for ${successCount} sample(s)`);
    console.log(`  ${css.split('\n').length} lines per file`);
    console.log(`  ${Object.keys(tokenConfig.colors).length} colors`);
    console.log(`  ${Object.keys(tokenConfig.spacing).length} spacing tokens`);
    console.log(`  ${Object.keys(tokenConfig.typography.fontSizes).length} font sizes`);

    if (errors.length > 0) {
      console.error('\nErrors:');
      errors.forEach((err) => console.error(`  ${err}`));
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Failed to generate tokens CSS:', error);
    process.exit(1);
  }
}

main();
