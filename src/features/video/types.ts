export interface SubtitleTrack {
	/** Track number as declared in the container — pass this to extractSubtitleTrack to select it. */
	trackNumber: number;
	/** Subtitle codec, lowercased — "utf8" (plain SRT-style text), "ass", "ssa". */
	codec: string;
	/** Language tag from the container, if the file has one, e.g. "eng". */
	language?: string;
	/** Non-standard track name/description, if the file sets one. */
	name?: string;
	/** Whether this codec is a text format this tool can convert to plain SRT text. */
	extractable: boolean;
}

// matroska-subtitles only ever reports tracks whose CodecID starts with
// "S_TEXT" in the first place (image-based formats like PGS/VobSub are
// filtered out before we ever see them) — every codec string it can
// produce is text-based. This list is about which ones we know how to
// turn into clean plain text today.
const KNOWN_TEXT_SUBTITLE_CODECS = new Set(["utf8", "ass", "ssa", "webvtt"]);

export function isExtractableCodec(codec: string): boolean {
	return KNOWN_TEXT_SUBTITLE_CODECS.has(codec);
}

/**
 * Strips ASS/SSA inline formatting down to plain text: removes {\...}
 * override blocks (italics, positioning, karaoke timing, etc. — this
 * tool has no concept of subtitle styling) and turns the literal \N / \n
 * line-break escape codes ASS uses into real newlines.
 */
export function stripAssFormatting(text: string): string {
	return text.replace(/\{[^}]*\}/g, "").replace(/\\N/g, "\n").replace(/\\n/g, "\n");
}
