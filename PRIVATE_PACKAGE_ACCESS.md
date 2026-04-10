# Installing Private Packages from Zambit

This guide explains how to install `@zambit/elevate-ts-commercial` (and other private Zambit packages) in your project.

## What You'll Need

- An npm account (free)
- An npm authentication token from Zambit
- Your project's `package.json`

---

## Step 1: Get Your Token

Zambit will provide you with an npm authentication token. It looks like:

```text
npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Keep this token private.** Treat it like a password.

---

## Step 2: Add the Token to Your .npmrc

The `.npmrc` file tells npm how to authenticate to private registries. It lives in your home directory.

### Option A: Single Token (Simple)

If this is your only private npm package, add these two lines to `~/.npmrc`:

```text
@zambit:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Replace `npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual token.

---

### Option B: Multiple Tokens (Advanced)

If you use multiple private packages from different organizations, your `~/.npmrc` might look like:

```text
# Zambit packages (commercial libraries)
@zambit:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=npm_zambit_token_xxxxxxxxxxxxx

# Acme packages (if you have another org)
@acme:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=npm_acme_token_yyyyyyyyyyyyyyy

# Optional: other settings
registry=https://registry.npmjs.org/
```

The format is:

- `@{ORG}:registry=https://registry.npmjs.org/` — Tells npm where to find @org packages
- `//registry.npmjs.org/:_authToken={TOKEN}` — Provides the authentication token

---

## Step 3: Install the Package

Once your `.npmrc` is set up, installation is normal:

```bash
npm install @zambit/elevate-ts-commercial
```

Or add it to your `package.json`:

```json
{
  "dependencies": {
    "@zambit/elevate-ts-commercial": "^0.1.2"
  }
}
```

Then run:

```bash
npm install
```

---

## Using in Your Code

Import from the private package like any other:

```typescript
import { Either, Left, Right } from '@zambit/elevate-ts-commercial'
import { Maybe, Just, Nothing } from '@zambit/elevate-ts-commercial'

// Use as normal
const result: Either<string, number> = Right(42)
```

---

## CI/CD Environments (GitHub Actions, etc.)

If you're deploying from CI/CD, don't commit your token to git. Instead:

### GitHub Actions Example

1. Go to your repository settings
2. Add a secret: `NPM_TOKEN=npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. In your workflow file (`.github/workflows/deploy.yml`):

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      
      # Create .npmrc with token
      - name: Configure npm
        run: |
          echo "@zambit:registry=https://registry.npmjs.org/" >> ~/.npmrc
          echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}" >> ~/.npmrc
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
```

### Docker Example

Add to your `Dockerfile`:

```dockerfile
FROM node:24

WORKDIR /app

# Copy npmrc template
COPY .npmrc.template .npmrc.template

# Accept NPM_TOKEN as build arg
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc && \
    echo "@zambit:registry=https://registry.npmjs.org/" >> ~/.npmrc

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

Build with:

```bash
docker build --build-arg NPM_TOKEN=npm_xxxxx -t myapp .
```

---

## Troubleshooting

### Error: "404 Not Found"

**Cause:** npm can't find the package. Usually means the token is missing or invalid.

**Fix:**

- Double-check your `.npmrc` file exists in `~/.npmrc`
- Verify the token hasn't expired (contact Zambit for a new one)
- Make sure `@zambit:registry` is set correctly

Test with:

```bash
npm view @zambit/elevate-ts-commercial
```

### Error: "401 Unauthorized"

**Cause:** Token is invalid or expired.

**Fix:**

- Get a fresh token from Zambit
- Update your `.npmrc`
- Clear npm cache: `npm cache clean --force`
- Try again

### Error: "EACCES: permission denied"

**Cause:** npm doesn't have permission to write to directories.

**Fix:**

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

---

## Security Best Practices

1. **Never commit `.npmrc` to git** — Use `.gitignore`:

   ```text
   .npmrc
   ```

2. **Never share your token** — Treat it like a password

3. **Rotate tokens regularly** — Ask Zambit for a fresh token every 6-12 months

4. **Use scoped tokens** — Zambit should provide tokens scoped to `@zambit/elevate-ts-commercial` only, not broader access

5. **Revoke old tokens** — When switching tokens, ask Zambit to revoke the old one

---

## Support

If you have issues:

1. Check your `.npmrc` file: `cat ~/.npmrc`
2. Verify the token is correct (compare with what Zambit sent)
3. Try clearing npm cache: `npm cache clean --force`
4. Contact Zambit: [support@zambit.com](mailto:support@zambit.com)

---

## Quick Reference

| Task | Command |
|------|---------|
| View your .npmrc | `cat ~/.npmrc` |
| Test token works | `npm view @zambit/elevate-ts-commercial` |
| Clear npm cache | `npm cache clean --force` |
| Install package | `npm install @zambit/elevate-ts-commercial` |
| Update package | `npm update @zambit/elevate-ts-commercial` |
