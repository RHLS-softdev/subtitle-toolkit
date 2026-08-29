import type { SubtitleDocument, SubtitleCue } from "./model";
import { SubtitleParseError } from "./model";

// Matches "00:01:02,345". A period is also accepted before the milliseconds
// because some hand-edited SRT files use it by mistake; output always uses
// a comma, since that's the correct SRT convention.
const TIMESTAMP_PATTERN = /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/;

function timestampToMs(value: string, blockPosition: number, cueNumber: number): number {
	const match = value.trim().match(TIMESTAMP_PATTERN);

	if (!match) {
		throw new SubtitleParseError(
			blockPosition,
			`Subtitle ${cueNumber} has an invalid timestamp.`,
			`Expected "HH:MM:SS,mmm" but got "${value}".`,
		);
	}

	const [, hh, mm, ss, ms] = match;

	return (
		Number(hh) * 3_600_000 +
		Number(mm) * 60_000 +
		Number(ss) * 1_000 +
		Number(ms)
	);
}

/** Formats milliseconds as an SRT timestamp: "HH:MM:SS,mmm". */
export function msToTimestamp(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) {
		throw new RangeError(`Cannot format a negative or non-finite time as a timestamp: ${ms}`);
	}

	// Round first so a stray fractional millisecond (e.g. from an FPS
	// conversion) can never carry the seconds field past 999ms.
	let remaining = Math.round(ms);

	const hours = Math.floor(remaining / 3_600_000);
	remaining %= 3_600_000;

	const minutes = Math.floor(remaining / 60_000);
	remaining %= 60_000;

	const seconds = Math.floor(remaining / 1_000);
	const milliseconds = remaining % 1_000;

	return (
		[hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":") +
		"," +
		String(milliseconds).padStart(3, "0")
	);
}

/**
 * Parses a human-typed time value into milliseconds, for editable UI
 * fields (not file parsing — parseSrt/timestampToMs handle that, and stay
 * strict). Lenient about what a person actually wants to type by hand:
 * hours are optional, minutes are optional once hours are dropped, and
 * milliseconds are optional too — "125.3", "2:05.3", and "1:02:05.300"
 * are all accepted, and always read as "...:MM:SS" from the right so a
 * bare "2:05" means two minutes, not two hours.
 * Returns null instead of throwing on anything unparseable, so callers
 * can drive their own field-level validation directly off the result.
 */
export function parseFlexibleTimestamp(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") return null;

	const match = trimmed.match(/^(?:(\d+):)?(?:(\d+):)?(\d+(?:\.\d+)?)$/);
	if (!match) return null;

	const parts = [match[1], match[2], match[3]].filter((part) => part !== undefined);
	const seconds = Number(parts[parts.length - 1]);
	const minutes = parts.length >= 2 ? Number(parts[parts.length - 2]) : 0;
	const hours = parts.length >= 3 ? Number(parts[parts.length - 3]) : 0;

	if (!Number.isFinite(seconds) || !Number.isFinite(minutes) || !Number.isFinite(hours)) return null;

	return Math.round((hours * 3_600 + minutes * 60 + seconds) * 1_000);
}

/**
 * Formats milliseconds the way a person would write a timestamp by hand:
 * "M:SS.mmm", extending to "H:MM:SS.mmm" once an hour is needed. This is
 * the inverse of parseFlexibleTimestamp, for editable UI fields — unlike
 * msToTimestamp (always the full "HH:MM:SS,mmm" SRT file format), it
 * drops the hours column when it's just noise.
 */
export function formatFriendlyTimestamp(ms: number): string {
	const safeMs = Number.isFinite(ms) && ms > 0 ? Math.round(ms) : 0;

	const hours = Math.floor(safeMs / 3_600_000);
	const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
	const seconds = Math.floor((safeMs % 60_000) / 1_000);
	const milliseconds = safeMs % 1_000;

	const secondsPart = `${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, "0")}:${secondsPart}`;
	}
	return `${minutes}:${secondsPart}`;
}

/**
 * Parses an SRT file's text content into a SubtitleDocument.
 *
 * Throws SubtitleParseError on the first cue it cannot understand, with a
 * plain-language message plus a technical detail for anyone who wants it.
 * We fail fast rather than silently dropping cues: a subtitle file that
 * loses lines without telling the user is worse than one that refuses to
 * load.
 */
export function parseSrt(input: string): SubtitleDocument {
	const normalized = input
		.replace(/^\uFEFF/, "") // UTF-8 BOM, if TextDecoder didn't already strip it
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	const blocks = normalized
		.split(/\n{2,}/)
		.map((block) => block.trim())
		.filter(Boolean);

	const cues: SubtitleCue[] = [];

	blocks.forEach((block, i) => {
		const blockPosition = i + 1;
		const lines = block.split("\n");

		if (lines.length < 2) {
			throw new SubtitleParseError(
				blockPosition,
				`Subtitle ${blockPosition} is missing its timing line.`,
				`Block only had ${lines.length} line(s): ${JSON.stringify(block)}`,
			);
		}

		const index = Number(lines[0].trim());

		if (!Number.isInteger(index)) {
			throw new SubtitleParseError(
				blockPosition,
				`Subtitle ${blockPosition} has an invalid cue number.`,
				`Expected an integer but got "${lines[0]}".`,
			);
		}

		const timing = lines[1].match(/^(.+?)\s+-->\s+(.+?)(?:\s+.*)?$/);

		if (!timing) {
			throw new SubtitleParseError(
				blockPosition,
				`Subtitle ${index} has an invalid timing line.`,
				`Expected "start --> end" but got "${lines[1]}".`,
			);
		}

		const [, start, end] = timing;

		// Two lines (number + timing) is a valid cue with empty text —
		// not something to discard.
		const text = lines.slice(2).join("\n");

		cues.push({
			index,
			startMs: timestampToMs(start, blockPosition, index),
			endMs: timestampToMs(end, blockPosition, index),
			text,
		});
	});

	return {
		cues,
		format: "srt",
	};
}
