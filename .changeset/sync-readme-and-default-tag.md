---
'@zambit/elevate-ts': patch
---

# Release Process Hygiene

Drops the `publishConfig.tag: "agpl"` pin and the matching `--tag agpl`
flag in `publish.yml`, so each release lands on the default `latest`
dist-tag. Previously every release went to the `agpl` tag, which left
the npmjs.com package page and plain `npm install @zambit/elevate-ts`
stuck on an older version until `latest` was moved by hand. Also adds
a new `check:readme` step (wired into `prepublishOnly`) that fails if
the README's npm version badge ever drifts from `package.json`. No
runtime / API change — release plumbing only.
