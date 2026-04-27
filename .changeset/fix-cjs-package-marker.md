---
"@zambit/elevate-ts": patch
---

# CJS Package Marker

Add dist/cjs/package.json marker to identify CommonJS output. This tells
Node.js and Vitest to treat .js files in dist/cjs/ as CommonJS, preventing
the spread syntax iterator error across all platforms.
