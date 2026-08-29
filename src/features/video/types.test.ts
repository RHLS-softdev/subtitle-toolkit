import { describe, it, expect } from "vitest";
import { isExtractableCodec, stripAssFormatting } from "./types";

describe("isExtractableCodec", () => {
	it("accepts known text subtitle codecs", () => {
		expect(isExtractableCodec("utf8")).toBe(true);
		expect(isExtractableCodec("ass")).toBe(true);
		expect(isExtractableCodec("ssa")).toBe(true);
		expect(isExtractableCodec("webvtt")).toBe(true);
	});

	it("rejects unrecognized codecs", () => {
		expect(isExtractableCodec("unknown_future_format")).toBe(false);
	});
});

describe("stripAssFormatting", () => {
	it("removes {\\...} override blocks", () => {
		expect(stripAssFormatting("{\\an8}Hello {\\i1}world{\\i0}!")).toBe("Hello world!");
	});

	it("converts \\N and \\n escape codes to real newlines", () => {
		expect(stripAssFormatting("Line one\\NLine two\\nLine three")).toBe("Line one\nLine two\nLine three");
	});

	it("leaves plain text untouched", () => {
		expect(stripAssFormatting("Just plain text.")).toBe("Just plain text.");
	});
});
