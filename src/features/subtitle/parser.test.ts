import { describe, it, expect } from "vitest";
import { parseSrt, msToTimestamp, parseFlexibleTimestamp, formatFriendlyTimestamp } from "./parser";
import { SubtitleParseError } from "./model";

describe("parseSrt", () => {
	it("parses a simple SRT file", () => {
		const input = [
			"1",
			"00:00:01,000 --> 00:00:02,500",
			"Hello there.",
			"",
			"2",
			"00:00:03,000 --> 00:00:04,000",
			"General Kenobi.",
			"",
		].join("\n");

		const doc = parseSrt(input);

		expect(doc.format).toBe("srt");
		expect(doc.cues).toHaveLength(2);
		expect(doc.cues[0]).toEqual({ index: 1, startMs: 1000, endMs: 2500, text: "Hello there." });
		expect(doc.cues[1]).toEqual({ index: 2, startMs: 3000, endMs: 4000, text: "General Kenobi." });
	});

	it("joins multiline subtitle text and preserves cue order", () => {
		const input = ["1", "00:00:01,000 --> 00:00:02,000", "Line one", "Line two", ""].join("\n");

		const doc = parseSrt(input);

		expect(doc.cues[0].text).toBe("Line one\nLine two");
	});

	it("handles CRLF line endings", () => {
		const input = ["1", "00:00:01,000 --> 00:00:02,000", "Hi", "", "2", "00:00:03,000 --> 00:00:04,000", "Bye", ""].join(
			"\r\n",
		);

		const doc = parseSrt(input);

		expect(doc.cues).toHaveLength(2);
		expect(doc.cues[0].text).toBe("Hi");
	});

	it("strips a leading UTF-8 BOM character", () => {
		const input = "\uFEFF" + ["1", "00:00:01,000 --> 00:00:02,000", "Hi", ""].join("\n");

		const doc = parseSrt(input);

		expect(doc.cues[0].index).toBe(1);
	});

	it("accepts a cue with empty subtitle text", () => {
		const input = ["1", "00:00:01,000 --> 00:00:02,000", "", "2", "00:00:03,000 --> 00:00:04,000", "Text", ""].join(
			"\n",
		);

		const doc = parseSrt(input);

		expect(doc.cues).toHaveLength(2);
		expect(doc.cues[0].text).toBe("");
	});

	it("parses hour-long timestamps", () => {
		const input = ["1", "01:23:45,678 --> 01:23:50,000", "Late in the film", ""].join("\n");

		const doc = parseSrt(input);

		expect(doc.cues[0].startMs).toBe(1 * 3_600_000 + 23 * 60_000 + 45_000 + 678);
	});

	it("preserves Unicode text", () => {
		const input = ["1", "00:00:01,000 --> 00:00:02,000", "こんにちは、世界！ 🎬", ""].join("\n");

		const doc = parseSrt(input);

		expect(doc.cues[0].text).toBe("こんにちは、世界！ 🎬");
	});

	it("throws a friendly SubtitleParseError for an invalid timestamp", () => {
		const input = ["1", "not-a-time --> 00:00:02,000", "Hi", ""].join("\n");

		expect(() => parseSrt(input)).toThrow(SubtitleParseError);
		try {
			parseSrt(input);
		} catch (error) {
			expect(error).toBeInstanceOf(SubtitleParseError);
			expect((error as SubtitleParseError).message).toBe("Subtitle 1 has an invalid timestamp.");
		}
	});

	it("throws a friendly SubtitleParseError for a missing timing line", () => {
		const input = "1";

		expect(() => parseSrt(input)).toThrow(SubtitleParseError);
	});
});

describe("msToTimestamp", () => {
	it("formats milliseconds as HH:MM:SS,mmm", () => {
		expect(msToTimestamp(0)).toBe("00:00:00,000");
		expect(msToTimestamp(3_723_456)).toBe("01:02:03,456");
	});

	it("rejects negative values", () => {
		expect(() => msToTimestamp(-1)).toThrow(RangeError);
	});
});

describe("parseFlexibleTimestamp", () => {
	it("parses plain seconds", () => {
		expect(parseFlexibleTimestamp("125.3")).toBe(125_300);
	});

	it("parses minutes:seconds", () => {
		expect(parseFlexibleTimestamp("2:05.3")).toBe(125_300);
	});

	it("parses hours:minutes:seconds", () => {
		expect(parseFlexibleTimestamp("1:02:05.300")).toBe(3_725_300);
	});

	it("treats a bare minutes:seconds pair as minutes, not hours", () => {
		expect(parseFlexibleTimestamp("2:05")).toBe(125_000);
	});

	it("returns null for empty or unparseable input", () => {
		expect(parseFlexibleTimestamp("")).toBeNull();
		expect(parseFlexibleTimestamp("not a time")).toBeNull();
	});
});

describe("formatFriendlyTimestamp", () => {
	it("formats as M:SS.mmm below an hour", () => {
		expect(formatFriendlyTimestamp(125_300)).toBe("2:05.300");
	});

	it("adds an hours column past an hour", () => {
		expect(formatFriendlyTimestamp(3_725_300)).toBe("1:02:05.300");
	});

	it("round-trips through parseFlexibleTimestamp", () => {
		const ms = 3_725_300;
		expect(parseFlexibleTimestamp(formatFriendlyTimestamp(ms))).toBe(ms);
	});
});
