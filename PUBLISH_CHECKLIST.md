# Publication Checklist for elevate-ts

Before publishing `elevate-ts` to npm, verify all items on this checklist:

## Pre-Publication Verification

- [ ] npm account logged in (`npm whoami`)
- [ ] Package name `elevate-ts` is available at npmjs.com/package/elevate-ts
- [ ] `package.json` version updated (currently `0.1.0`; increment as appropriate)
- [ ] `CHANGELOG.md` updated with changes for this release
- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] No Node.js built-ins detected: `pnpm check:nodeps`
- [ ] Markdownlint clean: `pnpm lint:md`
- [ ] Git status is clean (no uncommitted changes)
- [ ] All commits are signed (if your project requires signed commits)

## Publication

Once all items are checked:

```bash
pnpm publish --access public
```

This will:

1. Prompt for npm OTP (one-time password) if 2FA is enabled.
2. Upload the package to npm.
3. Create a new git tag (handled by npm publish hooks if configured).

## Post-Publication

- [ ] Verify the package appears on npmjs.com/package/elevate-ts
- [ ] Verify all files are accessible (run `npm view elevate-ts`)
- [ ] Test installation in a fresh project: `npm install elevate-ts`
- [ ] Update any linked documentation or roadmap
- [ ] Announce the release on relevant channels

## Rollback (if needed)

If a critical issue is discovered after publishing:

```bash
npm unpublish elevate-ts@version --force
```

(Note: npm allows unpublishing only within the first 24 hours after publication.)

Then fix the issue, increment the version, rebuild, and republish.

---

**Good luck with the release!**
