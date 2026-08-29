import type { SubtitleDocument } from "./model";
import { msToTimestamp } from "./parser";

/**
 * Serializes a SubtitleDocument back to SRT text.
 *
 * Cues are always renumbered 1..N in their current order on export. This
 * keeps the output file valid even after a shift, drift correction, or
 * manual reordering leaves the original `index` values stale or duplicated
 * — SRT players expect a clean, gapless sequence.
 */
export function serializeSrt(document: SubtitleDocument): string {
	return (
		document.cues
			.map((cue, i) => {
				const number = i + 1;

				return [
					number,
					`${msToTimestamp(cue.startMs)} --> ${msToTimestamp(cue.endMs)}`,
					cue.text,
				].join("\n");
			})
			.join("\n\n") + "\n"
	);
}
