import { describe, it, expect } from "vitest";
import { censorText, censorDocument } from "./censor";
import type { SubtitleDocument } from "./model";

describe("censorText", () => {
	it("masks a word partially, keeping the first letter", () => {
		expect(censorText("What the fuck was that?", ["fuck"], "partial")).toBe("What the f*** was that?");
	});

	it("fully redacts a word to a fixed placeholder regardless of length", () => {
		expect(censorText("What the fuck was that?", ["fuck"], "full")).toBe("What the [____] was that?");
	});

	it("is case-insensitive but preserves the matched case in partial mode", () => {
		expect(censorText("FUCK that.", ["fuck"], "partial")).toBe("F*** that.");
	});

	it("only matches whole words", () => {
		expect(censorText("This class is great.", ["ass"], "partial")).toBe("This class is great.");
	});

	it("leaves text alone when no words are configured", () => {
		expect(censorText("Hello world.", [], "partial")).toBe("Hello world.");
	});

	it("ignores blank entries in the word list", () => {
		expect(censorText("damn it", ["", "  ", "damn"], "partial")).toBe("d*** it");
	});
});

describe("censorDocument", () => {
	it("applies censoring across every cue", () => {
		const doc: SubtitleDocument = {
			format: "srt",
			cues: [
				{ index: 1, startMs: 0, endMs: 1000, text: "shit happens" },
				{ index: 2, startMs: 1000, endMs: 2000, text: "clean line" },
			],
		};

		const result = censorDocument(doc, ["shit"], "full");

		expect(result.cues[0].text).toBe("[____] happens");
		expect(result.cues[1].text).toBe("clean line");
	});
});
