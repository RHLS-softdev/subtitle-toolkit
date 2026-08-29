import { useState } from "react";

interface ShiftToolProps {
	onApply: (offsetMs: number) => void;
}

export function ShiftTool({ onApply }: ShiftToolProps) {
	const [seconds, setSeconds] = useState("0");

	const parsed = Number(seconds);
	const isValid = seconds.trim() !== "" && Number.isFinite(parsed);

	return (
		<div className="tool-panel">
			<p className="help-text">
				Move every subtitle earlier or later by a fixed amount. Use a negative number to make subtitles appear
				sooner.
			</p>
			<div className="field-row">
				<div className="field">
					<label htmlFor="shift-seconds">Offset (seconds)</label>
					<input
						id="shift-seconds"
						type="number"
						step="0.1"
						value={seconds}
						onChange={(event) => setSeconds(event.target.value)}
					/>
				</div>
				<button className="btn" disabled={!isValid || parsed === 0} onClick={() => onApply(parsed * 1000)}>
					Apply shift
				</button>
			</div>
		</div>
	);
}
