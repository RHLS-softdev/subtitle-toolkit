# Subtitle Toolkit

A free, browser-based toolkit for cleaning up and preparing `.srt` subtitle
files — shift timing, convert frame rates, correct drift, censor words,
validate against common style guides, and extract embedded subtitles from
MKV/WebM video. Everything runs client-side: no file you open here is ever
uploaded anywhere.

## Features

- **Shift** — nudge every timestamp by a fixed offset (positive or negative).
- **FPS Converter** — rescale timing when a subtitle was authored for a
  different frame rate than the video.
- **Drift Correction** — fix subtitles that slowly fall out of sync, using
  two reference points (drag a line from the preview to fill one in).
- **Censor** — mask chosen words across the whole file. Profanity and slurs
  are kept as two separate word lists in the UI — profanity comes with a
  small built-in starter list; the slur list ships empty by design and is
  entirely up to you to fill in.
- **Validator** — flags invalid/overlapping timing and lines that run long,
  against a selectable style guide (Netflix, BBC, WAI, the EU's EAA, or the
  Netflix Japanese/Chinese TTSGs). One click auto-wraps a too-long line.
- **Extract from video** — pulls embedded text subtitle tracks (SRT, ASS/SSA)
  straight out of an `.mkv`/`.webm` container by streaming the file, without
  loading it fully into memory or decoding any video/audio. Other containers
  (MP4, MOV, AVI, ...) aren't supported yet — see [Roadmap](#roadmap).
- **Encoding** — re-decode a file under a different text encoding if it came
  in garbled, and optionally add a BOM on export.

## Getting started

```bash
npm install
npm run dev       # starts the dev server
```

Other commands:

```bash
npm run build      # typecheck + production build, output in dist/
npm run preview    # serve the production build locally
npm test           # run the test suite once
npm run test:watch # run tests in watch mode
npm run lint        # eslint
```

## How it's built

- **React 19 + TypeScript + Vite 7**, no server component today — the whole
  app is static files that run entirely in the browser.
- **`matroska-subtitles`** streams `.mkv`/`.webm` files directly (no video
  engine, no WASM download) to list and extract embedded subtitle tracks.
  `vite-plugin-node-polyfills` shims the couple of Node core modules that
  library's dependency chain expects.
- **`src/features/`** holds all the framework-independent logic (parsing,
  transforms, validation, video extraction) — these files don't import
  React, and are the first place to add tests for new behavior.
- **`src/components/`** is the UI layer that wires those features together.

### Feedback

There's a Feedback button in the app header — it opens a small form and
hands off to a `mailto:` link, so feedback goes straight to a real inbox
with no backend or data collection involved. See
[`src/components/FeedbackPanel.tsx`](src/components/FeedbackPanel.tsx).

## Pro (commercial layer)

Pro is a $9 one-time purchase unlocking **batch processing** (many .srt
files with one transform config, ZIP output), **batch video extraction**
(every text subtitle track from many MKV/WebM files), and **saved
presets** (named transform configs re-appliable in one click).

The architecture keeps the subtitle engine completely independent of the
commercial layer, per the "Sloth Stack" plan:

- `src/features/` — the pure, framework-independent engine (parser,
  model, transforms, serializer, validator, encoding, video
  extraction). **No React, no Clerk, no Convex in here.**
- `src/lib/entitlements.ts` — the single Pro boundary: one
  `Entitlements` flags object; components never test "plan" strings.
- `src/components/pro/ProPanel.tsx` — the only file importing
  Clerk/Convex. Lazy-loaded, so the free tool's bundle never touches the
  commercial stack.
- `convex/` — the backend: `users` + `purchases` tables, a $9 Stripe
  Checkout mutation, and a webhook that is the **only** path that grants
  Pro. Subtitle/video bytes never go near it — all processing stays in
  the browser.

See [`SETUP.md`](SETUP.md) for connecting the live Convex/Clerk/Stripe
deployment. Still open for later: a broader-format video engine
(MP4/MOV/AVI via FFmpeg — lazy-loaded, per the plan).

## For AI coding agents

See [`AGENTS.md`](AGENTS.md) for project conventions before making changes.

## License

Not yet decided — treat as all-rights-reserved until a license is added.
