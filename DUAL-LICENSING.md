# Dual Licensing Guide

elevate-ts is available under two complementary licenses:

## AGPL-3.0 (Open Source)

**For:** Open source projects, research, educational use

```bash
npm install elevate-ts@agpl
```

- **Cost:** Free
- **Requirements:** If you modify elevate-ts, you must share your improvements under AGPL-3.0
- **License:** [LICENSE](./LICENSE) — GNU Affero General Public License v3.0 or later

## Commercial License

**For:** Proprietary, closed-source, or commercial projects

```bash
npm install elevate-ts@commercial
```

- **Cost:** Contact us for pricing
- **Requirements:** No sharing required. Use in proprietary products without restrictions
- **License:** [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md)

**Contact:** [sales@zambit.com](mailto:sales@zambit.com)

---

## Publishing Workflow

Both versions are published to npm under the same version number with different dist-tags.

### Publish AGPL Version

```bash
git tag v1.0.0
git push --tags
```

GitHub Actions automatically publishes with the `agpl` tag.

### Publish Commercial Version

```bash
git tag v1.0.0-commercial
git push --tags
```

GitHub Actions automatically publishes with the `commercial` tag.

### Local Testing

```bash
# Verify AGPL package excludes commercial license
npm pack
tar tzf elevate-ts-0.1.0.tgz | grep COMMERCIAL  # Should return nothing

# Dry-run commercial publish (review what would be published)
npm run publish:commercial --dry-run  # Note: npm may not support --dry-run on custom scripts
```

---

## How It Works

1. **Source Repository:** Contains both LICENSE (AGPL) and COMMERCIAL-LICENSE.md
2. **npm AGPL Tag:** `.npmignore` excludes COMMERCIAL-LICENSE.md → users see only AGPL
3. **npm Commercial Tag:** Publishing script swaps LICENSE files temporarily, publishes, restores
4. **User Installation:** They choose which tag to install based on their use case

---

## Compliance

- ✅ Both licenses available in source repo (transparency)
- ✅ Separate dist-tags on npm (easy to identify which version you have)
- ✅ AGPL compliance through proper file organization and licensing headers
- ✅ Commercial terms clear and enforceable through version tagging

---

For detailed legal and technical implementation details, see [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md).
