import { describe, it, expect } from "vitest";
import { detectBomEncoding, decodeSubtitleBytes, encodeSubtitleText } from "./encoding";

describe("detectBomEncoding", () => {
	it("detects a UTF-8 BOM", () => {
		const buffer = new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69]).buffer;
		expect(detectBomEncoding(buffer)).toBe("utf-8");
	});

	it("returns null when there is no BOM", () => {
		const buffer = new Uint8Array([0x68, 0x69]).buffer;
		expect(detectBomEncoding(buffer)).toBeNull();
	});
});

describe("decodeSubtitleBytes / encodeSubtitleText", () => {
	it("round-trips UTF-8 text, including Unicode", () => {
		const text = "こんにちは 🎬";
		const encoded = encodeSubtitleText(text);
		const decoded = decodeSubtitleBytes(encoded.buffer as ArrayBuffer, "utf-8");

		expect(decoded).toBe(text);
	});

	it("strips a BOM left over after decoding", () => {
		const withBom = encodeSubtitleText("hi", true);
		const decoded = decodeSubtitleBytes(withBom.buffer as ArrayBuffer, "utf-8");

		expect(decoded).toBe("hi");
	});

	it("decodes windows-1252 text", () => {
		// "café" in windows-1252: c-a-f-é(0xE9)
		const bytes = new Uint8Array([0x63, 0x61, 0x66, 0xe9]).buffer;
		expect(decodeSubtitleBytes(bytes, "windows-1252")).toBe("café");
	});
});
