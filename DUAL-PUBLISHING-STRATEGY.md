# Dual Publishing Strategy

This document outlines how elevate-ts publishes to two separate registries with different licenses.

## Overview

```
npm org: elevate-ts (under mlhamatzbt)
GitHub org: zambit
GitHub repo: zambit/elevate-ts (public)
```

**AGPL Version:**
- Package: `elevate-ts` (unscoped, public)
- Registry: npmjs.org
- Anyone can download

**Commercial Version:**
- Package: `@zambit/elevate-ts-commercial` (scoped to GitHub)
- Registry: GitHub Packages (private)
- Only org members with GitHub auth can download

---

## Part 1: Changes on Publish Side

### A. Update `package.json`

```json
{
  "name": "elevate-ts",
  "version": "0.1.2",
  "description": "Functional programming library for TypeScript. Available under AGPL-3.0 or Commercial License.",
  "license": "AGPL-3.0-or-later",
  "type": "module",
  "repository": {
    "type": "git",
    "url": "https://github.com/zambit/elevate-ts.git"
  },
  "homepage": "https://github.com/zambit/elevate-ts",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  },
  "scripts": {
    "publish:agpl": "npm publish --registry https://registry.npmjs.org",
    "publish:commercial": "tsx scripts/publish-commercial.ts",
    "prepublishOnly": "pnpm build && pnpm test && pnpm lint:md && pnpm check:nodeps"
  }
}
```

**Key changes:**
- `"name": "elevate-ts"` (unscoped, discoverable)
- `"registry"` explicitly set to npmjs.org
- `"publish:agpl"` script added

### B. Create `.npmrc` in repo root (for CI/CD)

```text
# NPM public registry (for AGPL publishes)
registry=https://registry.npmjs.org

# GitHub Packages registry (for commercial publishes)
@zambit:registry=https://npm.pkg.github.com
```

### C. Update `scripts/publish-commercial.ts`

This script swaps the package name and LICENSE file, then publishes to GitHub Packages.

```typescript
#!/usr/bin/env node

/**
 * Publish commercial version to GitHub Packages.
 *
 * 1. Updates package.json name to @zambit/elevate-ts-commercial
 * 2. Swaps LICENSE (AGPL → commercial)
 * 3. Publishes to GitHub Packages registry
 * 4. Restores everything
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const pkgPath = 'package.json'
const licensePath = 'LICENSE'
const agplBackupPath = 'LICENSE.agpl'
const commercialLicensePath = 'COMMERCIAL-LICENSE.md'

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const originalName = pkg.name
const originalLicense = pkg.license

console.log('Publishing commercial version to GitHub Packages...')

try {
  // Update package
  pkg.name = '@zambit/elevate-ts-commercial'
  pkg.license = 'SEE COMMERCIAL-LICENSE.md'
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

  // Swap licenses
  execSync(`mv ${licensePath} ${agplBackupPath}`)
  execSync(`cp ${commercialLicensePath} ${licensePath}`)

  // Publish to GitHub Packages
  execSync('npm publish --registry https://npm.pkg.github.com', { stdio: 'inherit' })
  console.log('Commercial version published to GitHub Packages!')
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
} finally {
  // Restore
  pkg.name = originalName
  pkg.license = originalLicense
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

  execSync(`rm ${licensePath}`)
  execSync(`mv ${agplBackupPath} ${licensePath}`)
}
```

### D. Update `.github/workflows/publish.yml`

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - run: pnpm install
      - run: pnpm build
      - run: pnpm test

      # Determine which version to publish
      - name: Determine License
        id: license
        run: |
          TAG=${{ github.ref_name }}
          if [[ $TAG == *"-commercial" ]]; then
            echo "type=commercial" >> $GITHUB_OUTPUT
          else
            echo "type=agpl" >> $GITHUB_OUTPUT
          fi

      # Publish AGPL to npmjs.org
      - name: Publish AGPL to npm
        if: steps.license.outputs.type == 'agpl'
        run: npm publish --registry https://registry.npmjs.org
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      # Publish Commercial to GitHub Packages
      - name: Publish Commercial to GitHub Packages
        if: steps.license.outputs.type == 'commercial'
        run: pnpm publish:commercial
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Part 2: Changes to Documentation

### A. Update `README.md`

```markdown
# elevate-ts

Point-free, data-last functional programming for TypeScript.

## Installation

### AGPL-3.0 (Free, Open Source)

```bash
npm install elevate-ts
```

See [LICENSE](./LICENSE) for terms. You must share modifications under AGPL-3.0.

### Commercial License (Proprietary Use)

```bash
npm install @zambit/elevate-ts-commercial --registry=https://npm.pkg.github.com
```

See [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md) and [COMMERCIAL_ACCESS.md](./COMMERCIAL_ACCESS.md) for setup and terms.

## Quick Start

```typescript
import { pipe } from 'elevate-ts/Function'
import { Just, map, chain } from 'elevate-ts/Maybe'
```
```

### B. Create `COMMERCIAL_ACCESS.md`

```markdown
# Commercial Package Access

This guide explains how to install `@zambit/elevate-ts-commercial` from GitHub Packages.

## Prerequisites

- A GitHub account with access to the Zambit org
- An npm account (optional, but recommended)

## Step 1: Get Your Token

Ask Zambit for a GitHub personal access token. It looks like:

```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or create your own:
1. GitHub.com → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Scopes: `read:packages`

## Step 2: Configure npm

Add to your `~/.npmrc`:

```text
@zambit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Multiple Organizations

If you use packages from multiple orgs:

```text
# Zambit commercial packages
@zambit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_zambit_xxxxx

# Other orgs
@acme:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_acme_xxxxx

# Public npm (default)
registry=https://registry.npmjs.org
```

## Step 3: Install

```bash
npm install @zambit/elevate-ts-commercial
```

## CI/CD Setup

### GitHub Actions

```yaml
- name: Install dependencies
  run: npm install
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Docker

```dockerfile
ARG GITHUB_TOKEN
RUN echo "@zambit:registry=https://npm.pkg.github.com" >> ~/.npmrc && \
    echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> ~/.npmrc && \
    npm install
```

Build with:

```bash
docker build --build-arg GITHUB_TOKEN=ghp_xxx -t myapp .
```

## Troubleshooting

### Error: 404 Not Found

**Cause:** npm can't find the package or you don't have access.

**Fix:**
- Verify you have GitHub access to the Zambit org
- Confirm token is valid: `npm view @zambit/elevate-ts-commercial --registry=https://npm.pkg.github.com`
- Check `.npmrc` is correct: `cat ~/.npmrc`

### Error: 401 Unauthorized

**Cause:** Token expired or invalid.

**Fix:**
- Create new token at GitHub.com → Settings → Developer settings → Personal access tokens
- Update `~/.npmrc` with new token
- Run `npm cache clean --force`

### Error: ENOENT: no such file or directory

**Cause:** `.npmrc` configuration missing or incorrect.

**Fix:**
- Make sure `@zambit:registry` is set in `~/.npmrc`
- Run `npm cache clean --force`
- Try again

## Support

Contact: support@zambit.com
```

### C. Update `PUBLISH_CHECKLIST.md`

Add this section:

```markdown
## Publishing Flow

### AGPL Version

```bash
git tag v1.0.0      # Triggers publish to npmjs.org
git push --tags
```

GitHub Actions automatically:
1. Detects tag `v1.0.0` (no `-commercial` suffix)
2. Publishes to npmjs.org
3. Creates GitHub Release

Verify:
```bash
npm view elevate-ts
npm search elevate-ts
```

### Commercial Version

```bash
git tag v1.0.0-commercial   # Triggers publish to GitHub Packages
git push --tags
```

GitHub Actions automatically:
1. Detects tag with `-commercial` suffix
2. Publishes to GitHub Packages
3. Creates GitHub Release

Verify (with GitHub auth):
```bash
npm view @zambit/elevate-ts-commercial --registry=https://npm.pkg.github.com
```
```

---

## Part 3: Complete Publishing Workflow

### Step 1: Create Changeset (during development)

During development, document changes with changesets:

```bash
pnpm changeset
```

Follow prompts:
- Select: `elevate-ts`
- Select: `patch` (bug fix), `minor` (feature), or `major` (breaking)
- Write description

This creates a file in `.changeset/` with your change details.

### Step 2: Merge to Main

When ready to release, create PR and merge `initial` → `main`:

```bash
git push origin initial
# Create PR on GitHub (initial → main)
# Have reviewer approve
# Merge
```

### Step 3A: Publish AGPL (Public to npmjs.org)

After merge to main, create and push git tag:

```bash
# Pull main locally
git checkout main
git pull origin main

# Check current version in package.json
cat package.json | grep version

# Create and push tag
git tag v0.1.2
git push origin v0.1.2
```

**GitHub Actions automatically:**
1. Detects tag `v0.1.2` (no `-commercial` suffix)
2. Runs: `npm publish --registry https://registry.npmjs.org`
3. Uses `NPM_TOKEN` secret for authentication
4. Creates GitHub Release
5. Done ✅

**Verify publication:**
```bash
npm view elevate-ts
npm install elevate-ts  # Test it locally
```

### Step 3B: Publish Commercial (Optional, to GitHub Packages)

If you want to release a commercial version alongside AGPL:

```bash
git tag v0.1.2-commercial
git push origin v0.1.2-commercial
```

**GitHub Actions automatically:**
1. Detects tag with `-commercial` suffix
2. Runs: `pnpm publish:commercial`
   - Updates package name to `@zambit/elevate-ts-commercial`
   - Swaps LICENSE files
   - Publishes to GitHub Packages
3. Uses `GITHUB_TOKEN` (automatic)
4. Creates GitHub Release
5. Restores original state
6. Done ✅

**Verify publication (with GitHub auth):**
```bash
npm view @zambit/elevate-ts-commercial --registry=https://npm.pkg.github.com
```

---

## Part 4: Environment Setup for CI/CD

### NPM_TOKEN (for npmjs.org publishing)

1. Log into npm.com
2. Go to your profile → **Access Tokens**
3. Click **Generate new token**
4. Choose **Granular access token**
5. Permissions:
   - `publish:packages` (required)
   - Scoped to `elevate-ts` package
   - Expiration: 1 year
6. Copy the token
7. In GitHub repo → Settings → **Secrets and variables** → **Actions**
8. Create secret: `NPM_TOKEN` = (paste token)

### GITHUB_TOKEN (automatic)

GitHub Actions provides `${{ secrets.GITHUB_TOKEN }}` automatically. No setup needed.

It has permission to publish to GitHub Packages by default.

---

## Part 5: Summary

| Aspect | AGPL | Commercial |
|--------|------|------------|
| Package name | `elevate-ts` | `@zambit/elevate-ts-commercial` |
| Registry | npmjs.org | GitHub Packages |
| Git tag pattern | `v1.0.0` | `v1.0.0-commercial` |
| Public? | Yes | No (GitHub auth required) |
| Discovery | Visible on npmjs | GitHub Packages only |
| License file | AGPL-3.0 | Commercial License |
| Authentication | None (public) | GitHub token |
| Automation | GitHub Actions | GitHub Actions |

---

## Troubleshooting

### Publish fails: "404 Not Found"

**AGPL:**
- Check `NPM_TOKEN` is set correctly in GitHub secrets
- Verify you have publish rights to `elevate-ts` on npmjs

**Commercial:**
- Verify you have publish rights to `@zambit` org on GitHub Packages
- Check GitHub Packages is enabled in org settings

### Publish fails: "Already exists"

You can only publish each version once per registry. Solutions:

1. Bump version in `package.json`
2. Create new changeset: `pnpm changeset`
3. Merge and retag

Or, within 24 hours, unpublish and retry:

```bash
npm unpublish elevate-ts@0.1.2 --force
npm publish
```

### Can't install commercial version

**Error: 404 Not Found**
- Verify GitHub token is valid
- Verify `@zambit:registry` is in `.npmrc`

**Error: 401 Unauthorized**
- GitHub token expired or incorrect
- Create new token at GitHub.com → Settings → Developer settings

### Both AGPL and commercial published same version

This is fine. They have different package names:
- `elevate-ts` on npmjs
- `@zambit/elevate-ts-commercial` on GitHub Packages

Both can exist at v0.1.2 simultaneously.

---

## See Also

- [COMMERCIAL_ACCESS.md](./COMMERCIAL_ACCESS.md) — Setup instructions for clients
- [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md) — Commercial license terms
- `.github/workflows/publish.yml` — Automated publishing workflow
- `scripts/publish-commercial.ts` — Commercial package publishing script
