import { useState } from "react";
import { extractAllTracks, trackOutputFileName, type ExtractedTrackResult } from "../../features/batch/batchVideo";
import { downloadZip } from "../../lib/zip";
import { downloadBlob } from "../../lib/download";
import { MovieIcon, LoaderIcon, CircleCheckIcon, CircleXIcon, DownloadIcon, XIcon } from "../icons/TablerIcons";

/*
 * Pro batch video extraction: pull every text subtitle track out of many
 * MKV/WebM files and download the SRTs as a ZIP. Reuses the exact
 * streaming engine as the free single-file Extract tool — see
 * src/features/batch/batchVideo.ts.
 */

const ACCEPTED_EXTENSIONS = [".mkv", ".webm"];

function hasAcceptedExtension(name: string): boolean {
	const lower = name.toLowerCase();
	return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function BatchExtractTool({ onBack }: { onBack: () => void }) {
	const [files, setFiles] = useState<File[]>([]);
	const [results, setResults] = useState<ExtractedTrackResult[] | null>(null);
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	function addFiles(list: FileList | null) {
		if (!list || list.length === 0) return;
		const ok = Array.from(list).filter((f) => hasAcceptedExtension(f.name));
		const skipped = list.length - ok.length;
		setFiles((prev) => [...prev, ...ok]);
		setResults(null);
		if (skipped > 0) setError(`${skipped} file${skipped === 1 ? "" : "s"} skipped (only .mkv / .webm are supported).`);
		else setError(null);
	}

	async function handleRun() {
		if (files.length === 0) return;
		setRunning(true);
		setError(null);
		setResults([]);
		const out: ExtractedTrackResult[] = [];
		try {
			for (const file of files) {
				setProgress(`Reading ${file.name}…`);
				const tracks = await extractAllTracks(file, (videoName, loaded, total) => {
					const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
					setProgress(`Reading ${videoName}… ${pct}%`);
				});
				out.push(...tracks);
			}
			setResults(out);
		} catch (err) {
			console.error("[batch extract] failed:", err);
			setError("Couldn't read one of the files — it may not be a valid Matroska (.mkv/.webm) file.");
		} finally {
			setRunning(false);
			setProgress(null);
		}
	}

	async function handleZip() {
		if (!results || results.length === 0) return;
		const stamp = new Date().toISOString().slice(0, 10);
		await downloadZip(
			results.map((r) => ({ name: trackOutputFileName(r.videoName, r.track), content: r.srt })),
			`subtitle-toolkit-tracks-${stamp}.zip`,
		);
	}

	return (
		<div className="pro-tool">
			<div className="pro-tool-header">
				<h3>Batch extract subtitles from video</h3>
				<button className="btn-secondary btn" onClick={onBack}>
					<XIcon size={16} /> Close
				</button>
			</div>

			<label className="drop-zone batch-drop">
				<MovieIcon size={28} className="drop-icon" />
				<p>
					Drop .mkv / .webm files here, or{" "}
					<span className="batch-browse">
						browse
						<input
							type="file"
							multiple
							accept=".mkv,.webm,video/x-matroska,video/webm"
							onChange={(e) => addFiles(e.target.files)}
						/>
					</span>
				</p>
			</label>

			{error && <p className="pro-warning">{error}</p>}

			{files.length > 0 && (
				<p className="help-text">
					{files.length} file{files.length === 1 ? "" : "s"} ready ·{" "}
					<button className="btn-secondary btn" onClick={() => setFiles([])}>
						Clear
					</button>
				</p>
			)}

			<div className="pro-actions">
				<button className="btn" onClick={handleRun} disabled={files.length === 0 || running}>
					{running ? (
						<>
							<LoaderIcon size={16} /> {progress ?? "Extracting…"}
						</>
					) : (
						"Extract all subtitle tracks"
					)}
				</button>
			</div>

			{results && (
				<div className="batch-results">
					<div className="pro-tool-header">
						<h4>
							{results.length} track{results.length === 1 ? "" : "s"} extracted
						</h4>
						{results.length > 0 && (
							<button className="btn" onClick={handleZip}>
								<DownloadIcon size={16} /> Download all as ZIP
							</button>
						)}
					</div>
					{results.length === 0 && <p className="help-text">No text subtitle tracks found in those files.</p>}
					<ul className="batch-result-list">
						{results.map((r, i) => (
							<li key={i}>
								<CircleCheckIcon size={16} />
								<span className="batch-file-name">{trackOutputFileName(r.videoName, r.track)}</span>
								<span className="batch-status">
									{r.track.language ? `${r.track.language} · ` : ""}
									{r.track.codec}
								</span>
								<button
									className="btn-secondary btn"
									onClick={() => downloadBlob(r.srt, trackOutputFileName(r.videoName, r.track), "application/x-subrip;charset=utf-8")}
								>
									<DownloadIcon size={14} /> .srt
								</button>
							</li>
						))}
					</ul>
				</div>
			)}

			{!running && results === null && (
				<p className="help-text">
					<CircleXIcon size={14} /> Only text subtitle tracks (SRT/ASS/SSA-style) are extracted — image-based
					tracks like PGS/VobSub are skipped.
				</p>
			)}
		</div>
	);
}
