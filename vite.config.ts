import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		// matroska-subtitles (the MKV/WebM subtitle-track parser) is built
		// for Node as well as the browser, and its dependency chain expects
		// a few Node core modules to exist: `zlib` (for tracks that use
		// compressed subtitle data), plus `stream`/`buffer`/`process`
		// underneath its `readable-stream`-based parser. Vite doesn't
		// polyfill those by default (unlike webpack) — this plugin is the
		// standard fix, rather than hand-rolling shims for each one.
		nodePolyfills({ include: ["zlib", "stream", "buffer", "process"] }),
	],
	test: {
		environment: "jsdom",
	},
});
