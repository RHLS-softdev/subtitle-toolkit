import type { SubtitleDocument } from "./model";

/** Common frame rates offered as one-click presets in the UI. Not exhaustive — any positive FPS works. */
export const FPS_PRESETS = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60] as const;

/**
 * Shifts every cue by a fixed offset. Positive offsetMs delays subtitles,
 * negative advances them. Clamped at zero: a subtitle cannot start before
 * the file begins.
 */
export function shift(document: SubtitleDocument, offsetMs: number): SubtitleDocument {
	return {
		...document,
		cues: document.cues.map((cue) => ({
			...cue,
			startMs: Math.max(0, cue.startMs + offsetMs),
			endMs: Math.max(0, cue.endMs + offsetMs),
		})),
	};
}

/**
 * Converts cue timing between two frame rates.
 *
 * This assumes the timestamps were authored for content running at
 * sourceFps and the video has been (or will be) sped up/slowed down to
 * targetFps — the classic case being a subtitle made for 23.976fps film
 * being applied to a 25fps PAL transfer, where the whole timeline
 * compresses by 23.976/25. That's why the scale factor is
 * sourceFps / targetFps rather than the other way around.
 *
 * Works for any positive FPS pair — the presets above are just shortcuts.
 */
export function convertFps(
	document: SubtitleDocument,
	sourceFps: number,
	targetFps: number,
): SubtitleDocument {
	if (!(sourceFps > 0) || !(targetFps > 0)) {
		throw new Error("FPS values must be greater than zero.");
	}

	const scale = sourceFps / targetFps;

	return {
		...document,
		cues: document.cues.map((cue) => ({
			...cue,
			startMs: Math.round(cue.startMs * scale),
			endMs: Math.round(cue.endMs * scale),
		})),
	};
}

/**
 * Wraps a block of subtitle text onto two lines, breaking at the space
 * closest to the middle so both halves come out close to even. Existing
 * line breaks are ignored and the text is re-flowed from scratch — this
 * is a mechanical wrap, not a content edit, so it always produces exactly
 * one break. If there's no space to break on (one long unbroken word,
 * e.g. a URL), it hard-splits at the midpoint instead.
 */
export function wrapLongLine(text: string): string {
	const flat = text.replace(/\s*\n\s*/g, " ").trim();
	if (flat.length === 0) return text;

	const middle = Math.floor(flat.length / 2);

	// Search outward from the middle in both directions for the nearest space.
	let breakAt = -1;
	for (let offset = 0; offset < flat.length; offset++) {
		const left = middle - offset;
		const right = middle + offset;
		if (left >= 0 && flat[left] === " ") {
			breakAt = left;
			break;
		}
		if (right < flat.length && flat[right] === " ") {
			breakAt = right;
			break;
		}
	}

	if (breakAt === -1) {
		return `${flat.slice(0, middle)}\n${flat.slice(middle)}`;
	}

	return `${flat.slice(0, breakAt)}\n${flat.slice(breakAt + 1)}`;
}

/** Applies wrapLongLine to the one cue matched by its printed .index — used by the Validator's "Split line" button. */
export function splitCueLine(document: SubtitleDocument, cueIndex: number): SubtitleDocument {
	return {
		...document,
		cues: document.cues.map((cue) => (cue.index === cueIndex ? { ...cue, text: wrapLongLine(cue.text) } : cue)),
	};
}

/**
 * Corrects linear drift using two synchronization points: a moment in the
 * subtitle track (sourceStartMs) that should land on a moment in the real
 * video (targetStartMs), and likewise for an end point. Everything between
 * is mapped proportionally. This is a distinct operation from `shift`
 * (constant offset) and `convertFps` (a single known frame-rate ratio) —
 * drift correction handles the case where the exact cause of the mismatch
 * isn't known, only two points where it lines up.
 */
export function correctDrift(
	document: SubtitleDocument,
	sourceStartMs: number,
	targetStartMs: number,
	sourceEndMs: number,
	targetEndMs: number,
): SubtitleDocument {
	const sourceSpan = sourceEndMs - sourceStartMs;

	if (sourceSpan === 0) {
		throw new Error("The two source sync points must be different times.");
	}

	const targetSpan = targetEndMs - targetStartMs;
	const scale = targetSpan / sourceSpan;

	const mapTime = (time: number) => Math.round(targetStartMs + (time - sourceStartMs) * scale);

	return {
		...document,
		cues: document.cues.map((cue) => ({
			...cue,
			startMs: Math.max(0, mapTime(cue.startMs)),
			endMs: Math.max(0, mapTime(cue.endMs)),
		})),
	};
}
