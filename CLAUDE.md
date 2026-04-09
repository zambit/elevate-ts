# Project Configuration & Standards

**Last Updated:** 2026-04-08

Claude should reference this file and the `llm-context/` imports for all implementation decisions.

> **[STOP] Never use complex emojis in any `.md` file.** They break PDF generation. Use text labels like `[NOTE]`, `[YES]`, `[NO]`, `[DONE]` instead. See `llm-context/SymbolGuidelines.md`.

---

## Zone 0: Setup (run once)

@llm-context/Setup.md

---

## Zone 1: Directives (always apply)

@llm-context/MandatoryRules.md
@llm-context/NeverDo.md
@llm-context/DefinitionOfDone.md
@llm-context/Workflow.md

---

## Zone 2: Coding Reference

@llm-context/CodingStandards.md
@llm-context/FunctionalPatterns.md
@llm-context/TestingStandards.md
@llm-context/AWSIntegration.md
@llm-context/Tooling.md

---

## Zone 3: Project Orientation

@llm-context/ProjectStructure.md
@llm-context/PackageDocumentation.md
@llm-context/SymbolGuidelines.md

---

## [REF] External Reference Documentation

- **purify-ts:** [https://gigobyte.github.io/purify/](https://gigobyte.github.io/purify/)
- **AWS SDK v3:** [https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- **AWS Lambda (Node):** [https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- **Vitest:** [https://vitest.dev/](https://vitest.dev/)
- **Optional — SvelteKit:** [https://kit.svelte.dev/](https://kit.svelte.dev/)
- **Optional — Cloudflare:** [https://developers.cloudflare.com/](https://developers.cloudflare.com/)

---

## [NOTE] About llm-context/

The `llm-context/` directory contains modular sections of these project standards.
Each file is independently editable — update a single section without touching others.
The `@` imports above pull them into this context automatically via Claude Code.
