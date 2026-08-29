// Framework-independent subtitle domain model.
// This file must not import React, Clerk, Convex, or FFmpeg.

/** A single subtitle cue: one block of text shown between two timestamps. */
export interface SubtitleCue {
	/** 1-based cue number as it appeared in (or is assigned to) the source file. */
	index: number;
	/** Start time, in milliseconds from the beginning of the file. */
	startMs: number;
	/** End time, in milliseconds from the beginning of the file. */
	endMs: number;
	/** Cue text. May contain internal newlines for multi-line subtitles. */
	text: string;
}

/** A parsed subtitle file, independent of its original on-disk format. */
export interface SubtitleDocument {
	cues: SubtitleCue[];
	format: "srt";
	/** Original file name, if the document came from a file the user loaded. */
	sourceFileName?: string;
}

/**
 * Thrown by the parser when a cue cannot be understood.
 * Carries the 1-based block position so the UI can show a plain-language
 * message like "Subtitle 14 has an invalid timestamp" instead of a raw
 * parser error.
 */
export class SubtitleParseError extends Error {
	/** 1-based position of the offending block in the file (not necessarily its printed index). */
	readonly blockPosition: number;
	/** Technical detail, safe to show collapsed under the friendly message. */
	readonly detail: string;

	constructor(blockPosition: number, message: string, detail: string) {
		super(message);
		this.name = "SubtitleParseError";
		this.blockPosition = blockPosition;
		this.detail = detail;
	}
}
