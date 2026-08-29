import { describe, it, expect } from "vitest";
import { shift, convertFps, correctDrift, wrapLongLine, splitCueLine } from "./transforms";
import type { SubtitleDocument } from "./model";

function doc(cues: SubtitleDocument["cues"]): SubtitleDocument {
	return { format: "srt", cues };
}

describe("shift", () => {
	it("shifts every cue by a positive offset", () => {
		const input = doc([{ index: 1, startMs: 1000, endMs: 2000, text: "a" }]);
		const result = shift(input, 2500);

		expect(result.cues[0]).toMatchObject({ startMs: 3500, endMs: 4500 });
	});

	it("allows a negative offset", () => {
		const input = doc([{ index: 1, startMs: 5000, endMs: 6000, text: "a" }]);
		const result = shift(input, -2000);

		expect(result.cues[0]).toMatchObject({ startMs: 3000, endMs: 4000 });
	});

	it("clamps at zero instead of going negative", () => {
		const input = doc([{ index: 1, startMs: 1000, endMs: 2000, text: "a" }]);
		const result = shift(input, -5000);

		expect(result.cues[0].startMs).toBe(0);
		expect(result.cues[0].endMs).toBe(0);
	});

	it("handles a large positive shift", () => {
		const input = doc([{ index: 1, startMs: 0, endMs: 1000, text: "a" }]);
		const result = shift(input, 10_000_000);

		expect(result.cues[0].startMs).toBe(10_000_000);
	});

	it("preserves cue order", () => {
		const input = doc([
			{ index: 1, startMs: 0, endMs: 1000, text: "a" },
			{ index: 2, startMs: 1000, endMs: 2000, text: "b" },
		]);
		const result = shift(input, 100);

		expect(result.cues.map((c) => c.text)).toEqual(["a", "b"]);
	});
});

describe("convertFps", () => {
	it("scales timestamps by sourceFps / targetFps", () => {
		const input = doc([{ index: 1, startMs: 100_000, endMs: 200_000, text: "a" }]);
		const result = convertFps(input, 25, 24);

		expect(result.cues[0].startMs).toBe(Math.round(100_000 * (25 / 24)));
		expect(result.cues[0].endMs).toBe(Math.round(200_000 * (25 / 24)));
	});

	it("is a no-op when source and target FPS match", () => {
		const input = doc([{ index: 1, startMs: 12_345, endMs: 23_456, text: "a" }]);
		const result = convertFps(input, 30, 30);

		expect(result.cues[0].startMs).toBe(12_345);
		expect(result.cues[0].endMs).toBe(23_456);
	});

	it("works with arbitrary positive FPS values, not just presets", () => {
		const input = doc([{ index: 1, startMs: 100_000, endMs: 100_000, text: "a" }]);
		const result = convertFps(input, 17.5, 22.3);

		expect(result.cues[0].startMs).toBe(Math.round(100_000 * (17.5 / 22.3)));
	});

	// Real-world case: a subtitle timed against 23.976fps (NTSC film rate)
	// applied to a 25fps PAL "speedup" release. The whole film plays about
	// 4.2% faster at 25fps, so a 2-hour (7,200,000ms) NTSC runtime shrinks
	// to 01:55:05,088 in the PAL version. Expected values below were
	// computed independently (exact rational arithmetic, not by calling
	// convertFps itself) so this test can't pass just because the
	// implementation is internally consistent with itself — it checks that
	// the timeline actually compresses in the right direction by the right
	// amount.
	it("converts 23.976fps timing to 25fps (PAL speedup shrinks the runtime)", () => {
		const input = doc([
			{ index: 1, startMs: 7_200_000, endMs: 7_200_000, text: "end of a 2-hour NTSC film" },
			{ index: 2, startMs: 3_723_456, endMs: 3_723_456, text: "1:02:03.456 in" },
			{ index: 3, startMs: 1_000, endMs: 1_000, text: "1 second in" },
		]);

		const result = convertFps(input, 23.976, 25);

		expect(result.cues[0].startMs).toBe(6_905_088); // 01:55:05,088
		expect(result.cues[1].startMs).toBe(3_570_943);
		expect(result.cues[2].startMs).toBe(959);
	});

	// The reverse: a subtitle timed against a 25fps PAL release applied
	// back to 23.976fps NTSC film timing. The runtime stretches back out —
	// 01:55:05,088 in PAL should land back on exactly 2:00:00,000 in NTSC
	// timing, the exact inverse of the case above.
	it("converts 25fps timing to 23.976fps (reverses a PAL speedup, runtime stretches)", () => {
		const input = doc([
			{ index: 1, startMs: 6_905_088, endMs: 6_905_088, text: "end of the PAL cut" },
			{ index: 2, startMs: 6_000_000, endMs: 6_000_000, text: "1:40:00 in PAL" },
			{ index: 3, startMs: 1_000, endMs: 1_000, text: "1 second in" },
		]);

		const result = convertFps(input, 25, 23.976);

		expect(result.cues[0].startMs).toBe(7_200_000); // exact round-trip of the case above
		expect(result.cues[1].startMs).toBe(6_256_256);
		expect(result.cues[2].startMs).toBe(1_043);
	});

	it("rejects zero or negative FPS", () => {
		const input = doc([{ index: 1, startMs: 0, endMs: 1000, text: "a" }]);

		expect(() => convertFps(input, 0, 25)).toThrow();
		expect(() => convertFps(input, 25, -1)).toThrow();
	});
});

describe("correctDrift", () => {
	it("maps intermediate timestamps linearly between two sync points", () => {
		const input = doc([
			{ index: 1, startMs: 0, endMs: 1000, text: "a" }, // source start
			{ index: 2, startMs: 5000, endMs: 6000, text: "b" }, // halfway
			{ index: 3, startMs: 10000, endMs: 11000, text: "c" }, // source end
		]);

		// Source 0 -> 10000 should map to target 1000 -> 21000 (double speed + 1s offset).
		const result = correctDrift(input, 0, 1000, 10000, 21000);

		expect(result.cues[0].startMs).toBe(1000);
		expect(result.cues[1].startMs).toBe(11000);
		expect(result.cues[2].startMs).toBe(21000);
	});

	it("rejects identical source sync points", () => {
		const input = doc([{ index: 1, startMs: 0, endMs: 1000, text: "a" }]);

		expect(() => correctDrift(input, 5000, 0, 5000, 1000)).toThrow();
	});
});

describe("wrapLongLine", () => {
	it("breaks a long line at the space nearest the middle", () => {
		expect(wrapLongLine("The quick brown fox jumps over the lazy dog today")).toBe(
			"The quick brown fox jumps\nover the lazy dog today",
		);
	});

	it("re-flows existing line breaks instead of stacking a third line", () => {
		expect(wrapLongLine("one two\nthree four")).toBe("one two\nthree four");
	});

	it("hard-splits a single unbroken word with no space to break on", () => {
		expect(wrapLongLine("a".repeat(10))).toBe("aaaaa\naaaaa");
	});

	it("leaves short text alone at the midpoint break", () => {
		expect(wrapLongLine("hi there")).toBe("hi\nthere");
	});
});

describe("splitCueLine", () => {
	it("wraps only the matching cue, by printed index", () => {
		const input = doc([
			{ index: 1, startMs: 0, endMs: 1000, text: "The quick brown fox jumps over the lazy dog today" },
			{ index: 2, startMs: 1000, endMs: 2000, text: "short" },
		]);

		const result = splitCueLine(input, 1);

		expect(result.cues[0].text).toContain("\n");
		expect(result.cues[1].text).toBe("short");
	});
});
