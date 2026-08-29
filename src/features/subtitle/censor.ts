import type { SubtitleDocument } from "./model";

export type CensorMode = "partial" | "full";

// A short, editable starting point — not exhaustive, and deliberately not
// trying to be. Users add or remove words to match their own content and
// audience; this just saves typing out the obvious ones. Common profanity
// only — never pre-populated in the UI (see CensorTool), just available
// behind an explicit "load" action so it isn't dumped on screen unasked.
export const DEFAULT_PROFANITY_WORDS = ["fuck", "shit", "bitch", "asshole", "bastard", "damn", "cunt", "piss", "dick", "cock"];

// Deliberately empty. Slurs are kept as a separate list from profanity (see
// CensorTool) so the two can't be mixed up, but this toolkit doesn't ship
// or maintain a slur catalogue — that list is for the user to build
// themselves, entirely by hand, behind the UI's explicit opt-in.
export const DEFAULT_SLUR_WORDS: string[] = [];

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Masks or redacts whole-word matches of the given word list in a string.
 * - "partial": keeps the first letter, replaces the rest with asterisks — "fuck" -> "f***".
 * - "full": replaces the whole word with a fixed placeholder, hiding its length too — "fuck" -> "[____]".
 * Matching is case-insensitive and whole-word only, so "class" is untouched even if "ass" is in the list.
 */
export function censorText(text: string, words: string[], mode: CensorMode): string {
	const cleaned = words.map((w) => w.trim()).filter(Boolean);
	if (cleaned.length === 0) return text;

	const pattern = new RegExp(`\\b(${cleaned.map(escapeRegExp).join("|")})\\b`, "gi");

	return text.replace(pattern, (match) => {
		if (mode === "full") return "[____]";
		return match[0] + "*".repeat(match.length - 1);
	});
}

/** Applies censorText across every cue in a document. */
export function censorDocument(document: SubtitleDocument, words: string[], mode: CensorMode): SubtitleDocument {
	return {
		...document,
		cues: document.cues.map((cue) => ({ ...cue, text: censorText(cue.text, words, mode) })),
	};
}
