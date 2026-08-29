import { useState } from "react";
import type { BatchResult, BatchTransformConfig } from "../../features/batch/batch";
import { defaultBatchConfig, processSrtFile } from "../../features/batch/batch";
import { buildOutputFilename } from "../../lib/file";
import { downloadZip } from "../../lib/zip";
import { downloadBlob } from "../../lib/download";
import { TransformConfigForm } from "./TransformConfigForm";
import { UploadIcon, LoaderIcon, CircleCheckIcon, CircleXIcon, AlertTriangleIcon, DownloadIcon, XIcon } from "../icons/TablerIcons";

/*
 * Pro batch tool: apply one transform config to many .srt files and
 * download the results as a ZIP. Everything runs locally (see
 * src/features/batch/batch.ts) — nothing is uploaded.
 */

const ACCEPTED_SRT = [".srt"];

function isSrtFile(name: string): boolean {
	const lower = name.toLowerCase();
	return ACCEPTED_SRT.some((ext) => lower.endsWith(ext));
}

export function BatchTool({ onBack }: { onBack: () => void }) {
	const [files, setFiles] = useState<File[]>([]);
	const [config, setConfig] = useState<BatchTransformConfig>(defaultBatchConfig);
	const [results, setResults] = useState<BatchResult[] | null>(null);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function addFiles(list: FileList | null) {
		if (!list || list.length === 0) return;
		const srt = Array.from(list).filter((f) => isSrtFile(f.name));
		const skipped = list.length - srt.length;
		setFiles((prev) => [...prev, ...srt]);
		setResults(null);
		if (skipped > 0) setError(`${skipped} file${skipped === 1 ? "" : "s"} skipped (only .srt files are processed).`);
		else setError(null);
	}

	async function handleRun() {
		if (files.length === 0) return;
		setRunning(true);
		setError(null);
		const out: BatchResult[] = [];
		for (const file of files) {
			out.push(await processSrtFile(file, config));
		}
		setResults(out);
		setRunning(false);
	}

	async function handleZip() {
		if (!results) return;
		const ok = results.filter((r) => !r.error && r.output.length > 0);
		if (ok.length === 0) return;
		const stamp = new Date().toISOString().slice(0, 10);
		await downloadZip(
			ok.map((r) => ({ name: buildOutputFilename(r.fileName, "fixed"), content: r.output })),
			`subtitle-toolkit-batch-${stamp}.zip`,
		);
	}

	const okCount = results?.filter((r) => !r.error).length ?? 0;

	return (
		<div className="pro-tool">
			<div className="pro-tool-header">
				<h3>Batch process .srt files</h3>
				<button className="btn-secondary btn" onClick={onBack}>
					<XIcon size={16} /> Close
				</button>
			</div>

			<label className="drop-zone batch-drop">
				<UploadIcon size={28} className="drop-icon" />
				<p>
					Drop .srt files here, or{" "}
					<span className="batch-browse">
						browse
						<input
							type="file"
							multiple
							accept=".srt,text/plain"
							onChange={(e) => addFiles(e.target.files)}
						/>
					</span>{" "}
					— or pick a whole folder:
				</p>
				<p>
					<button
						className="btn-secondary btn"
						onClick={(e) => {
							e.preventDefault();
							const input = document.createElement("input");
							input.type = "file";
							input.webkitdirectory = true;
							input.onchange = () => addFiles(input.files);
							input.click();
						}}
					>
						Choose folder
					</button>
				</p>
			</label>

			{error && (
				<p className="pro-warning">
					<AlertTriangleIcon size={16} /> {error}
				</p>
			)}

			{files.length > 0 && (
				<p className="help-text">
					{files.length} file{files.length === 1 ? "" : "s"} ready ·{" "}
					<button className="btn-secondary btn" onClick={() => setFiles([])}>
						Clear
					</button>
				</p>
			)}

			<TransformConfigForm config={config} onChange={setConfig} />

			<div className="pro-actions">
				<button className="btn" onClick={handleRun} disabled={files.length === 0 || running}>
					{running ? (
						<>
							<LoaderIcon size={16} /> Processing…
						</>
					) : (
						"Process files"
					)}
				</button>
			</div>

			{results && (
				<div className="batch-results">
					<div className="pro-tool-header">
						<h4>
							{okCount}/{results.length} processed
						</h4>
						{okCount > 0 && (
							<button className="btn" onClick={handleZip}>
								<DownloadIcon size={16} /> Download all as ZIP
							</button>
						)}
					</div>
					<ul className="batch-result-list">
						{results.map((r, i) => (
							<li key={i} className={r.error ? "is-error" : undefined}>
								{r.error ? <CircleXIcon size={16} /> : <CircleCheckIcon size={16} />}
								<span className="batch-file-name">{r.fileName}</span>
								{r.error ? (
									<span className="batch-status">{r.error}</span>
								) : (
									<span className="batch-status">
										{r.cueCount} cue{r.cueCount === 1 ? "" : "s"}
										{r.warnings.length > 0 ? ` · ${r.warnings.length} warning${r.warnings.length === 1 ? "" : "s"}` : ""}
									</span>
								)}
								{!r.error && (
									<button
										className="btn-secondary btn"
										onClick={() => downloadBlob(r.output, buildOutputFilename(r.fileName, "fixed"), "application/x-subrip;charset=utf-8")}
									>
										<DownloadIcon size={14} /> .srt
									</button>
								)}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
