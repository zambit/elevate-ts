import { writeFileSync } from 'fs';
import { resolve } from 'path';

const packageJson = {
  type: 'commonjs'
};

const filePath = resolve('dist/cjs/package.json');
writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`Generated ${filePath}`);
