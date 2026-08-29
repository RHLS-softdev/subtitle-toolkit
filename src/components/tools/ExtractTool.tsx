import { useRef, useState } from "react";
import { FileDrop } from "../FileDrop";
import { ErrorBanner } from "../ErrorBanner";
import { ProgressBar } from "../ProgressBar";
import type { SubtitleTrack } from "../../features/video/types";
import { listSubtitleTracks, extractSubtitleTrack } from "../../features/video/extract";
import type { ReadProgress } from "../../features/video/extract";
import { serializeSrt } from "../../features/subtitle/serializer";
import { LoaderIcon, SubtitlesIcon, CircleXIcon, XIcon } from "../icons/TablerIcons";

type Status = "idle" | "probing" | "ready" | "extracting";

interface ExtractToolProps {
	onExtracted: (srtText: string, sourceFileName: string) => void;
}

// Track listing/extraction only understands Matroska-family containers
// (.mkv, .webm) — matroska-subtitles parses the container directly, with
// no video-decoding engine involved, which is what makes this instant
// and memory-light. Other containers (MP4, MOV, AVI, ...) need a real
// demuxer and are a premium-tier feature for later.
const ACCEPTED_EXTENSIONS = [".mkv", ".webm"];

function hasAcceptedExtension(fileName: string): boolean {
	const lower = fileName.toLowerCase();
	return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function ExtractTool({ onExtracted }: ExtractToolProps) {
	const [videoFile, setVideoFile] = useState<File | null>(null);
	const [status, setStatus] = useState<Status>("idle");
	const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState<ReadProgress | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	async function handleVideoFile(file: File) {
		if (!hasAcceptedExtension(file.name)) {
			setError("This tool currently reads .mkv and .webm files only — other formats are a premium-tier feature, coming later.");
			return;
		}

		setVideoFile(file);
		setStatus("probing");
		setError(null);
		setTracks([]);

		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const found = await listSubtitleTracks(file, controller.signal);
			if (controller.signal.aborted) return;
			setTracks(found);
			setStatus("ready");
		} catch (err) {
			if (controller.signal.aborted) return;
			setStatus("idle");
			setVideoFile(null);
			setError("Couldn't read subtitle tracks from that video — it may not be a valid Matroska (.mkv/.webm) file.");
			console.error(err);
		}
	}

	async function handleExtract(track: SubtitleTrack) {
		if (!videoFile) return;
		setStatus("extracting");
		setError(null);
		setProgress({ loaded: 0, total: videoFile.size });

		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const document = await extractSubtitleTrack(videoFile, track, setProgress, controller.signal);
			onExtracted(serializeSrt(document), videoFile.name);
		} catch (err) {
			if (controller.signal.aborted) {
				setStatus("ready");
				return;
			}
			setStatus("ready");
			setError("Couldn't extract that subtitle track.");
			console.error(err);
		}
	}

	function handleCancel() {
		abortRef.current?.abort();
		setStatus(videoFile && tracks.length > 0 ? "ready" : "idle");
		if (tracks.length === 0) setVideoFile(null);
		setProgress(null);
	}

	if (!videoFile) {
		return (
			<>
				{error && <ErrorBanner message={error} />}
				<FileDrop
					onFile={handleVideoFile}
					accept="video/x-matroska,video/webm,.mkv,.webm"
					title="Drop an MKV or WebM video here, or click to browse"
					subtitle="Embedded text subtitle tracks (SRT, ASS/SSA) are read straight out of the container — the video itself is never uploaded, decoded, or fully loaded into memory. Other formats (MP4, MOV, AVI) are a premium-tier feature, coming later."
				/>
			</>
		);
	}

	const busy = status === "probing" || status === "extracting";

	return (
		<div className="tool-panel">
			{error && <ErrorBanner message={error} />}

			{status === "probing" && (
				<p className="help-text">
					<LoaderIcon size={16} className="spin" /> Reading the container's track list…
				</p>
			)}

			{status === "extracting" && progress && (
				<ProgressBar label="Extracting subtitle track" loaded={progress.loaded} total={progress.total} />
			)}

			{busy && (
				<button className="btn btn-secondary" onClick={handleCancel}>
					<XIcon size={16} /> Cancel
				</button>
			)}

			{status === "ready" && tracks.length === 0 && (
				<p className="help-text">No subtitle tracks were found in this video.</p>
			)}

			{status === "ready" && tracks.length > 0 && (
				<ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
					{tracks.map((track) => (
						<li key={track.trackNumber} className="field-row" style={{ alignItems: "center" }}>
							{track.extractable ? (
								<SubtitlesIcon size={18} />
							) : (
								<CircleXIcon size={18} style={{ color: "var(--color-text-muted)" }} />
							)}
							<span>
								Track {track.trackNumber} — {track.language ?? "unknown language"} ({track.codec})
								{track.name ? ` · ${track.name}` : ""}
							</span>
							<button className="btn" disabled={!track.extractable} onClick={() => handleExtract(track)}>
								{track.extractable ? "Extract" : "Not supported"}
							</button>
						</li>
					))}
				</ul>
			)}

			{!busy && (
				<button className="btn-secondary btn" onClick={() => setVideoFile(null)}>
					Choose a different video
				</button>
			)}
		</div>
	);
}
