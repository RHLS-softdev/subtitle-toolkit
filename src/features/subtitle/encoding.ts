// Encoding handling for subtitle files.
//
// Import: the browser's TextDecoder can read many legacy encodings, so we
// let the user pick one when a file doesn't look like valid UTF-8.
// Export: TextEncoder only ever produces UTF-8 — that's a Web Platform
// limitation, not a choice we're making — so exported files are always
// clean UTF-8. That covers the vast majority of players today and avoids
// hand-rolling legacy text encoders in the browser.

/** Encodings offered when importing a file that isn't valid UTF-8. */
export const SUPPORTED_IMPORT_ENCODINGS = [
	{ label: "utf-8", name: "UTF-8" },
	{ label: "windows-1252", name: "Windows-1252 (Western European)" },
	{ label: "iso-8859-1", name: "ISO-8859-1 (Latin-1)" },
	{ label: "shift_jis", name: "Shift-JIS (Japanese)" },
	{ label: "euc-kr", name: "EUC-KR (Korean)" },
	{ label: "gbk", name: "GBK (Simplified Chinese)" },
	{ label: "big5", name: "Big5 (Traditional Chinese)" },
	{ label: "utf-16le", name: "UTF-16LE" },
	{ label: "utf-16be", name: "UTF-16BE" },
] as const;

export type ImportEncodingLabel = (typeof SUPPORTED_IMPORT_ENCODINGS)[number]["label"];

/**
 * Looks at the first bytes of a file for a byte-order mark and returns the
 * encoding it implies, if any. This is BOM sniffing only — not general
 * charset detection — deliberately kept small for the MVP.
 */
export function detectBomEncoding(buffer: ArrayBuffer): ImportEncodingLabel | null {
	const bytes = new Uint8Array(buffer.slice(0, 3));

	if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
		return "utf-8";
	}
	if (bytes[0] === 0xff && bytes[1] === 0xfe) {
		return "utf-16le";
	}
	if (bytes[0] === 0xfe && bytes[1] === 0xff) {
		return "utf-16be";
	}

	return null;
}

/**
 * Decodes raw file bytes to text using the given encoding, stripping a
 * leading BOM if TextDecoder left one behind.
 */
export function decodeSubtitleBytes(buffer: ArrayBuffer, encoding: ImportEncodingLabel = "utf-8"): string {
	const decoder = new TextDecoder(encoding);
	return decoder.decode(buffer).replace(/^\uFEFF/, "");
}

/** Encodes text for export. Always UTF-8, optionally with a leading BOM. */
export function encodeSubtitleText(text: string, addBom = false): Uint8Array {
	const encoded = new TextEncoder().encode(text);

	if (!addBom) {
		return encoded;
	}

	const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
	const withBom = new Uint8Array(bom.length + encoded.length);
	withBom.set(bom, 0);
	withBom.set(encoded, bom.length);
	return withBom;
}
