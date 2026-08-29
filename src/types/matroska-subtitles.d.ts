// matroska-subtitles (https://github.com/mathiasvr/matroska-subtitles) ships
// no type declarations of its own — this covers only the surface this app
// actually uses. See its README for the full event/API shape.
declare module "matroska-subtitles" {
	export interface MatroskaSubtitleTrack {
		/** Track number as declared in the container; pass this to filter "subtitle" events to one track. */
		number: number;
		/** Language tag, e.g. "eng" — undefined if the file doesn't declare one. */
		language?: string;
		/** Subtitle codec, lowercased from the container's CodecID — e.g. "utf8" (SRT), "ass", "ssa". */
		type: string;
		/** Non-standard, but some files set it — often carries language/description info. */
		name?: string;
		header?: string;
	}

	export interface MatroskaSubtitleCue {
		/** Cue text. For "ass"/"ssa" tracks this is already isolated from the style/layer/etc. columns, but may still contain inline {\...} override tags and literal \N / \n line-break codes. */
		text: string;
		/** Start time, in milliseconds from the start of the file. */
		time: number;
		/** Cue duration, in milliseconds. */
		duration: number;
	}

	/**
	 * A Node Transform stream (via the `readable-stream` package, which
	 * works outside Node too) — feed it raw file bytes with `.write()` /
	 * `.end()`, no `fs`/`pipe()` required.
	 */
	export class SubtitleParser {
		once(event: "tracks", listener: (tracks: MatroskaSubtitleTrack[]) => void): this;
		on(event: "tracks", listener: (tracks: MatroskaSubtitleTrack[]) => void): this;
		on(event: "subtitle", listener: (subtitle: MatroskaSubtitleCue, trackNumber: number) => void): this;
		on(event: "error", listener: (error: Error) => void): this;
		once(event: "error", listener: (error: Error) => void): this;
		removeAllListeners(event?: string): this;
		write(chunk: Uint8Array): boolean;
		end(): void;
		destroy(error?: Error): void;
	}
}
