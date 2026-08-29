import { listSubtitleTracks, extractSubtitleTrack } from "../video/extract";
import type { SubtitleTrack } from "../video/types";
import { serializeSrt } from "../subtitle/serializer";
import type { SubtitleDocument } from "../subtitle/model";

/*
 * Batch video extraction — the Pro feature. Framework-independent: reuses
 * the streaming matroska-subtitles pipeline from src/features/video (the
 * same engine the free single-file Extract tool uses) over many files,
 * producing one SRT per extractable track, entirely in the browser.
 *
 * Note: each track extraction re-streams the container from scratch (the
 * single-file tool does the same), so a file with N tracks is read N
 * times. Sequential, not parallel, to keep peak memory flat.
 */

export interface ExtractedTrackResult {
	videoName: string;
	track: SubtitleTrack;
	srt: string;
}

/** Runs one full extraction pass over a file: list tracks, extract each text track. */
export async function extractAllTracks(
	file: File,
	onProgress?: (videoName: string, loaded: number, total: number) => void,
	signal?: AbortSignal,
): Promise<ExtractedTrackResult[]> {
	const tracks = await listSubtitleTracks(file, signal);
	const results: ExtractedTrackResult[] = [];

	for (const track of tracks) {
		if (signal?.aborted) break;
		if (!track.extractable) continue;

		const document: SubtitleDocument = await extractSubtitleTrack(
			file,
			track,
			(progress) => onProgress?.(file.name, progress.loaded, progress.total),
			signal,
		);
		results.push({ videoName: file.name, track, srt: serializeSrt(document) });
	}

	return results;
}

/** "ep05.mkv" + track {language:"eng", trackNumber:2} -> "ep05-track2-eng.srt" (missing parts dropped). */
export function trackOutputFileName(videoName: string, track: SubtitleTrack): string {
	const base = videoName.replace(/\.[a-zA-Z0-9]+$/, "");
	const parts = [`track${track.trackNumber}`, track.language].filter(Boolean);
	return `${base}-${parts.join("-")}.srt`;
}
