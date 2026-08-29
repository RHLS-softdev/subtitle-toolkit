import { describe, it, expect } from "vitest";
import { processSrtText, defaultBatchConfig, type BatchTransformConfig } from "./batch";

const SAMPLE = [
	"1",
	"00:00:01,000 --> 00:00:02,000",
	"Hello world",
	"",
	"2",
	"00:00:03,000 --> 00:00:04,000",
	"Goodbye",
	"",
].join("\n");

function config(overrides: Partial<BatchTransformConfig> = {}): BatchTransformConfig {
	return { ...defaultBatchConfig(), ...overrides };
}

describe("applyTransforms", () => {
	it("leaves the document untouched for an empty config", () => {
		const result = processSrtText(SAMPLE, "test.srt", config());
		expect(result.error).toBeUndefined();
		expect(result.cueCount).toBe(2);
		expect(result.output).toContain("00:00:01,000 --> 00:00:02,000");
	});

	it("shifts every cue by the configured seconds", () => {
		const result = processSrtText(SAMPLE, "test.srt", config({ shiftSeconds: 2 }));
		expect(result.output).toContain("00:00:03,000 --> 00:00:04,000");
		expect(result.output).toContain("00:00:05,000 --> 00:00:06,000");
	});

	it("converts frame rate with new = old * source / target", () => {
		// 23.976 -> 25 shrinks timestamps by 23.976/25 = 0.95904.
		const result = processSrtText(SAMPLE, "test.srt", config({ fpsSource: 23.976, fpsTarget: 25 }));
		// 1000ms * 0.95904 = 959ms
		expect(result.output).toContain("00:00:00,959 --> 00:00:01,918");
	});

	it("skips fps conversion when source equals target", () => {
		const result = processSrtText(SAMPLE, "test.srt", config({ fpsSource: 25, fpsTarget: 25 }));
		expect(result.output).toContain("00:00:01,000 --> 00:00:02,000");
	});

	it("censors listed words in full mode", () => {
		const result = processSrtText("1\n00:00:01,000 --> 00:00:02,000\nShit happens\n", "test.srt", config({ censorWords: ["shit"], censorMode: "full" }));
		expect(result.output).toContain("[____] happens");
	});

	it("keeps first letter in partial mode", () => {
		const result = processSrtText("1\n00:00:01,000 --> 00:00:02,000\nShit happens\n", "test.srt", config({ censorWords: ["shit"], censorMode: "partial" }));
		expect(result.output).toContain("S*** happens");
	});

	it("reports a parse error per file without throwing", () => {
		const result = processSrtText("1\n00:00:01,000 --> BAD\nHello\n", "broken.srt", config());
		expect(result.error).toBeTruthy();
		expect(result.output).toBe("");
		expect(result.cueCount).toBe(0);
	});
});
