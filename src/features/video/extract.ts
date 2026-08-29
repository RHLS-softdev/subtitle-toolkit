import { SubtitleParser } from "matroska-subtitles";
import type { MatroskaSubtitleTrack, MatroskaSubtitleCue } from "matroska-subtitles";
import type { SubtitleDocument } from "../subtitle/model";
import { isExtractableCodec, stripAssFormatting } from "./types";
import type { SubtitleTrack } from "./types";

export interface ReadProgress {
	loaded: number;
	/** File size in bytes. Always known up front — this is a local File, not a network download. */
	total: number;
}

// Yield to the event loop every this many chunks read from the file, so a
// big video's worth of synchronous container parsing can't wedge the tab
// for seconds at a time. (This is exactly what made the machine feel
// frozen under the old FFmpeg-based engine — see extract.test.ts for
// where that history is now guarded against.) The browser's own stream
// reader chunk size (commonly ~64KB) decides how often this actually
// fires in practice.
const YIELD_EVERY_N_CHUNKS = 25;

function toTrackInfo(track: MatroskaSubtitleTrack): SubtitleTrack {
	return {
		trackNumber: track.number,
		codec: track.type,
		language: track.language,
		name: track.name,
		extractable: isExtractableCodec(track.type),
	};
}

/**
 * Streams a File through onChunk in whatever piece sizes the browser's
 * own stream reader hands back — the whole file is never buffered in
 * memory at once, however large it is. Stops as soon as shouldStop()
 * returns true after a chunk (used to cut the read short once we have
 * what we need), or immediately if signal is aborted.
 */
export async function streamFile(
	file: File,
	onChunk: (chunk: Uint8Array, loaded: number) => void,
	options: { signal?: AbortSignal; shouldStop?: () => boolean } = {},
): Promise<{ aborted: boolean }> {
	const reader = file.stream().getReader();
	let loaded = 0;
	let chunkCount = 0;

	try {
		for (;;) {
			if (options.signal?.aborted) return { aborted: true };

			const { done, value } = await reader.read();
			if (done) return { aborted: false };

			loaded += value.byteLength;
			onChunk(value, loaded);
			chunkCount += 1;

			if (options.shouldStop?.()) return { aborted: false };

			if (chunkCount % YIELD_EVERY_N_CHUNKS === 0) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
		}
	} finally {
		await reader.cancel().catch(() => {});
	}
}

/**
 * Lists the subtitle tracks embedded in an MKV/WebM file. The container's
 * track list lives in its header, near the start of the file, so this
 * stops reading the moment that's been seen — unlike the old FFmpeg
 * engine, listing tracks does not require reading the whole video, and
 * needs no ~31MB engine download first.
 */
export async function listSubtitleTracks(file: File, signal?: AbortSignal): Promise<SubtitleTrack[]> {
	const parser = new SubtitleParser();
	let tracks: SubtitleTrack[] | null = null;

	parser.once("tracks", (rawTracks) => {
		tracks = rawTracks.map(toTrackInfo);
	});

	const failed = new Promise<never>((_, reject) => {
		parser.once("error", reject);
	});

	try {
		await Promise.race([
			streamFile(file, (chunk) => parser.write(chunk), { signal, shouldStop: () => tracks !== null }),
			failed,
		]);
	} finally {
		parser.removeAllListeners();
	}

	return tracks ?? [];
}

/**
 * Extracts one subtitle track's full text as a ready-to-use
 * SubtitleDocument. Unlike listing tracks, this does have to read the
 * whole file — cues are scattered across the entire timeline, there's no
 * shortcut — but memory use stays flat throughout regardless of file
 * size, rather than loading the whole video into memory (twice, in the
 * old engine's case).
 */
export async function extractSubtitleTrack(
	file: File,
	track: SubtitleTrack,
	onProgress?: (progress: ReadProgress) => void,
	signal?: AbortSignal,
): Promise<SubtitleDocument> {
	const parser = new SubtitleParser();
	const cues: MatroskaSubtitleCue[] = [];

	parser.on("subtitle", (subtitle, trackNumber) => {
		if (trackNumber === track.trackNumber) cues.push(subtitle);
	});

	const failed = new Promise<never>((_, reject) => {
		parser.once("error", reject);
	});

	const total = file.size;

	let result: { aborted: boolean };
	try {
		result = await Promise.race([
			streamFile(
				file,
				(chunk, loaded) => {
					parser.write(chunk);
					onProgress?.({ loaded, total });
				},
				{ signal },
			),
			failed,
		]);
	} finally {
		parser.end();
		parser.removeAllListeners();
	}

	if (result.aborted) {
		throw new DOMException("Extraction canceled", "AbortError");
	}

	const clean = track.codec === "ass" || track.codec === "ssa" ? stripAssFormatting : (text: string) => text;

	return {
		format: "srt",
		sourceFileName: file.name,
		cues: cues
			.slice()
			.sort((a, b) => a.time - b.time)
			.map((cue, i) => ({
				index: i + 1,
				startMs: cue.time,
				endMs: cue.time + cue.duration,
				text: clean(cue.text),
			})),
	};
}
