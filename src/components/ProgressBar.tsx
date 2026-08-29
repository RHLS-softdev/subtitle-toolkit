interface ProgressBarProps {
	label: string;
	loaded: number;
	/** Total bytes/units expected. */
	total: number;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A determinate progress bar with a percentage/byte-count readout — used anywhere a long-running step can report real progress, so it never looks stalled with no sense of when it'll end. */
export function ProgressBar({ label, loaded, total }: ProgressBarProps) {
	const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

	return (
		<div className="progress">
			<div className="progress-label">
				<span>{label}</span>
				<span>
					{percent}% · {formatBytes(loaded)} / {formatBytes(total)}
				</span>
			</div>
			<div className="progress-track">
				<div className="progress-fill" style={{ width: `${percent}%` }} />
			</div>
		</div>
	);
}
