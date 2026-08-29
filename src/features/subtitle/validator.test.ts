import { describe, it, expect } from "vitest";
import { validateSrt, LINE_LENGTH_GUIDELINES } from "./validator";
import type { SubtitleDocument } from "./model";

function doc(cues: SubtitleDocument["cues"]): SubtitleDocument {
	return { format: "srt", cues };
}

describe("validateSrt", () => {
	it("reports no warnings for a clean document", () => {
		const result = validateSrt(
			doc([
				{ index: 1, startMs: 0, endMs: 2000, text: "Hi" },
				{ index: 2, startMs: 2500, endMs: 4000, text: "Bye" },
			]),
		);

		expect(result).toEqual([]);
	});

	it("flags end time not after start time", () => {
		const result = validateSrt(doc([{ index: 1, startMs: 2000, endMs: 1000, text: "a" }]));

		expect(result.some((w) => w.type === "invalid-duration")).toBe(true);
	});

	it("flags overlapping cues", () => {
		const result = validateSrt(
			doc([
				{ index: 1, startMs: 0, endMs: 3000, text: "a" },
				{ index: 2, startMs: 2000, endMs: 4000, text: "b" },
			]),
		);

		expect(result.some((w) => w.type === "overlap")).toBe(true);
	});

	it("flags a cue that stays on screen too long", () => {
		const result = validateSrt(doc([{ index: 1, startMs: 0, endMs: 15_000, text: "a" }]));

		expect(result.some((w) => w.type === "long-duration")).toBe(true);
	});

	it("flags unusually long subtitle text", () => {
		const result = validateSrt(doc([{ index: 1, startMs: 0, endMs: 2000, text: "x".repeat(200) }]));

		expect(result.some((w) => w.type === "long-line")).toBe(true);
	});

	it("does not block on warnings — it always returns, never throws", () => {
		expect(() =>
			validateSrt(doc([{ index: 1, startMs: 5000, endMs: 1000, text: "x".repeat(200) }])),
		).not.toThrow();
	});
});

describe("validateSrt with a chosen line-length guideline", () => {
	it("uses the general Netflix limits (42 chars) by default", () => {
		const cue = { index: 1, startMs: 0, endMs: 2000, text: "x".repeat(40) };
		expect(validateSrt(doc([cue])).some((w) => w.type === "long-line")).toBe(false);
	});

	it("flags text that's fine under the default but too long for a stricter guideline (WAI, 32 chars)", () => {
		const cue = { index: 1, startMs: 0, endMs: 2000, text: "x".repeat(40) };
		const wai = LINE_LENGTH_GUIDELINES.find((g) => g.id === "wai")!;

		expect(validateSrt(doc([cue]), wai).some((w) => w.type === "long-line")).toBe(true);
	});

	it("applies the tight Netflix Japanese limit (13 characters)", () => {
		const cue = { index: 1, startMs: 0, endMs: 2000, text: "x".repeat(14) };
		const ja = LINE_LENGTH_GUIDELINES.find((g) => g.id === "netflix-ja")!;

		const result = validateSrt(doc([cue]), ja);
		expect(result[0].message).toContain("Netflix Japanese Timed Text Style Guide suggests keeping each line under 13");
	});
});
