import type { SubtitleDocument } from "./model";

export type SubtitleWarningType =
	| "invalid-duration"
	| "overlap"
	| "out-of-order"
	| "long-duration"
	| "long-line";

export interface SubtitleWarning {
	cueIndex: number;
	type: SubtitleWarningType;
	/** What's wrong. */
	message: string;
	/** A concrete next step — which tool to use, or what to change. */
	suggestion: string;
	/** True for a "long-line" warning that the auto-split button in the Validator can actually fix. */
	canAutoSplit?: boolean;
}

export interface LineLengthGuideline {
	id: string;
	/** Shown in the Validator's guideline dropdown. */
	label: string;
	maxLineCharacters: number;
	maxDisplayLines: number;
	/** One line of context on where the numbers come from — shown as a tooltip/help line next to the dropdown. */
	source: string;
}

// Character-per-line limits vary by style guide, and — for CJK languages —
// by script, since each character is a full display unit rather than a
// letter. These are formatting limits only: this app does not attempt to
// detect a cue's language or transliterate/count full-width vs half-width
// characters, it just checks plain character length against whichever
// guideline is selected (see CensorTool/DriftTool docs for the app's
// general "reuse, don't rebuild" approach — the same applies here).
export const LINE_LENGTH_GUIDELINES: LineLengthGuideline[] = [
	{
		id: "netflix-general",
		label: "Netflix (general)",
		maxLineCharacters: 42,
		maxDisplayLines: 2,
		source: "Netflix Timed Text Style Guide — General Requirements (most Latin-script languages).",
	},
	{
		id: "wai",
		label: "Web Accessibility Initiative (WAI)",
		maxLineCharacters: 32,
		maxDisplayLines: 2,
		source: "W3C WAI \u2014 Captions/Subtitles guidance: keep captions to 1\u20132 lines, generally under 32 characters per line.",
	},
	{
		id: "bbc",
		label: "BBC Guidelines",
		maxLineCharacters: 37,
		maxDisplayLines: 2,
		source: "BBC Subtitle Guidelines: 37 characters per line, 2 lines (3 permitted for vertical video, not modeled here).",
	},
	{
		id: "eaa",
		label: "European Accessibility Act",
		maxLineCharacters: 40,
		maxDisplayLines: 2,
		source: "The EAA/EN 301 549 sets no numeric line-length figure of its own \u2014 this uses the EBU/Teletext convention (EBU Tech 3360, 40-character row) commonly applied for EU broadcast accessibility compliance.",
	},
	{
		id: "netflix-ja",
		label: "Netflix Japanese Timed Text Style Guide",
		maxLineCharacters: 13,
		maxDisplayLines: 2,
		source: "Netflix Japanese TTSG: 13 full-width characters per line (horizontal). Counted here as plain characters, not full/half-width weighted.",
	},
	{
		id: "netflix-zh-hant",
		label: "Netflix Chinese (Traditional) Timed Text Style Guide",
		maxLineCharacters: 16,
		maxDisplayLines: 2,
		source: "Netflix Chinese (Traditional) TTSG: 16 characters per line.",
	},
	{
		id: "netflix-zh-hans",
		label: "Netflix Chinese (Simplified) Timed Text Style Guide",
		maxLineCharacters: 16,
		maxDisplayLines: 2,
		source: "Netflix Chinese (Simplified) TTSG: 16 characters per line.",
	},
];

const LONG_DURATION_MS = 10_000;

/**
 * Checks a document for common subtitle problems. Always returns warnings,
 * never throws — validation should inform the user, not block export.
 * Every warning pairs a plain description of the problem with a concrete
 * suggestion, so "something's wrong" always comes with "here's what to do
 * about it". `guideline` controls the long-line check's thresholds — it
 * defaults to the general Netflix limits, same as before this was
 * selectable.
 */
export function validateSrt(document: SubtitleDocument, guideline: LineLengthGuideline = LINE_LENGTH_GUIDELINES[0]): SubtitleWarning[] {
	const warnings: SubtitleWarning[] = [];

	for (let i = 0; i < document.cues.length; i++) {
		const cue = document.cues[i];

		if (cue.endMs <= cue.startMs) {
			warnings.push({
				cueIndex: cue.index,
				type: "invalid-duration",
				message: "End time is not after start time.",
				suggestion: "Use Drift Correction or edit this line's text to fix its timing directly.",
			});
		}

		const displayLines = cue.text.split("\n");
		const longestLine = displayLines.reduce((max, line) => Math.max(max, line.length), 0);

		if (longestLine > guideline.maxLineCharacters) {
			// Only a still-single-line cue can be usefully auto-wrapped to two
			// lines. One that's already at two lines and still over the limit
			// needs shorter wording, not another mechanical split.
			const canAutoSplit = displayLines.length < guideline.maxDisplayLines;

			warnings.push({
				cueIndex: cue.index,
				type: "long-line",
				message: `A line in this subtitle is ${longestLine} characters (${guideline.label} suggests keeping each line under ${guideline.maxLineCharacters}).`,
				suggestion: canAutoSplit
					? 'Click "Split line" to wrap this into two lines automatically, or edit it directly in the preview above.'
					: `Still long even split across ${guideline.maxDisplayLines} lines — shorten the wording by editing the line directly in the preview above.`,
				canAutoSplit,
			});
		}

		if (cue.endMs - cue.startMs > LONG_DURATION_MS) {
			warnings.push({
				cueIndex: cue.index,
				type: "long-duration",
				message: `Subtitle stays on screen for ${((cue.endMs - cue.startMs) / 1000).toFixed(1)}s (most guides suggest keeping it under ${LONG_DURATION_MS / 1000}s).`,
				suggestion: "Consider splitting this into two shorter cues.",
			});
		}

		const next = document.cues[i + 1];

		if (next) {
			if (cue.startMs > next.startMs) {
				warnings.push({
					cueIndex: cue.index,
					type: "out-of-order",
					message: `Starts after subtitle ${next.index}, which follows it.`,
					suggestion: "Use Drift Correction to re-sort timing, or edit the timestamps directly.",
				});
			} else if (cue.endMs > next.startMs) {
				warnings.push({
					cueIndex: cue.index,
					type: "overlap",
					message: `Overlaps subtitle ${next.index} by ${(cue.endMs - next.startMs)}ms.`,
					suggestion: "Shorten this line's end time, or delay subtitle " + next.index + " to start after it.",
				});
			}
		}
	}

	return warnings;
}
