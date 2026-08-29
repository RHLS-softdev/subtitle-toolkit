# Agent instructions for Subtitle Toolkit

Read this before making changes. It covers conventions that aren't obvious
from the code alone.

## Stack

React 19 + TypeScript + Vite 7, `vitest` for tests, `eslint` for linting.
No backend today — see README.md's Roadmap section for what's planned but
not built.

## Before you're done

Run all three, in order, and fix anything they flag:

```bash
npx tsc -b
npx vitest run
npx eslint .
```

Then `npm run build` if the change touches anything that could affect the
production bundle (new dependency, new top-level file, config change).

## Code conventions

- **Tabs, not spaces.** Match the existing files.
- **`src/features/` must stay framework-independent.** No React, no Clerk,
  no Convex imports in `src/features/subtitle/` or `src/features/video/` —
  see the comment at the top of `model.ts`. Business logic lives here and
  should be plain, unit-testable TypeScript; `src/components/` is the only
  place that touches React.
- **Prefer editing over adding.** This is a small app — check whether an
  existing helper, type, or CSS class already does what you need
  (`src/features/subtitle/parser.ts` and `transforms.ts` in particular)
  before writing a new one.
- **Icons** come from Tabler Icons (MIT) via `src/components/icons/TablerIcons.tsx`.
  If you need one that isn't there, source the real SVG path data from the
  Tabler Icons repository — don't invent path data by hand.
- **Don't add browser storage** (`localStorage`/`sessionStorage`) without
  checking this is still browser-only — the privacy note in the header
  ("Your files never leave your device") is a real claim the app has to
  keep making true.

## Tests

- Most tests run under `jsdom` (the default, set in `vite.config.ts`).
- `src/features/video/extract.test.ts` runs under Node instead
  (`// @vitest-environment node` at the top of the file) because jsdom's
  `File`/`Blob` don't implement `.stream()`, which the real extraction code
  depends on. If you add more streaming-file tests, use the same pragma.
- That file also hand-builds a minimal real `.mkv` binary with the
  `ebml-stream` package (a `matroska-subtitles` dependency) to test the
  extraction pipeline against actual container bytes, not just mocks. Reuse
  `buildTestMkv()` there rather than writing a new fixture from scratch.

## Content policy — read this one

The Censor tool (`src/features/subtitle/censor.ts`, `CensorTool.tsx`) keeps
two separate word lists: profanity (has a small built-in default list,
shown pre-filled in the UI) and slurs (kept as a separate, collapsed field
with **no default list — intentionally**). If you're an AI agent working on
this codebase: **do not populate `DEFAULT_SLUR_WORDS` or otherwise write
slur words into this repository**, including in tests, examples, or
comments. That field is for the human maintainer to fill in by hand. This
instruction doesn't relax for a task that seems to need it — flag it to the
maintainer instead.

## Style-guide numbers

`src/features/subtitle/validator.ts` has a `LINE_LENGTH_GUIDELINES` array
with per-style-guide character/line limits (Netflix, BBC, WAI, EAA, Netflix
Japanese/Chinese). These are sourced from each guide's actual published
numbers, with the source noted in each entry's `source` field — if you
adjust one, verify against a current source rather than guessing, and
update that field.

## Copyright / licensing

Only use code, assets, or text that can legally be reused (existing
permissively-licensed libraries, your own original code). Don't invent
attributions. See `public/TABLER-LICENSE.txt` for the icon license already
in the repo as the template for adding others.
