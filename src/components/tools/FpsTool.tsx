import { useState } from "react";
import { FPS_PRESETS } from "../../features/subtitle/transforms";

interface FpsToolProps {
	onApply: (sourceFps: number, targetFps: number) => void;
}

const CUSTOM = "custom";

export function FpsTool({ onApply }: FpsToolProps) {
	const [sourceChoice, setSourceChoice] = useState<string>(String(FPS_PRESETS[1])); // 24
	const [targetChoice, setTargetChoice] = useState<string>(String(FPS_PRESETS[2])); // 25
	const [customSource, setCustomSource] = useState("24");
	const [customTarget, setCustomTarget] = useState("25");

	const sourceFps = sourceChoice === CUSTOM ? Number(customSource) : Number(sourceChoice);
	const targetFps = targetChoice === CUSTOM ? Number(customTarget) : Number(targetChoice);
	const isValid = sourceFps > 0 && targetFps > 0;

	return (
		<div className="tool-panel">
			<p className="help-text">
				Convert timing between two frame rates — for example, subtitles timed for a 23.976fps film release
				being applied to a 25fps PAL version. Presets are shortcuts; any positive frame rate works.
			</p>
			<div className="field-row">
				<div className="field">
					<label htmlFor="fps-source">From (source FPS)</label>
					<FpsSelect id="fps-source" value={sourceChoice} onChange={setSourceChoice} />
					{sourceChoice === CUSTOM && (
						<input
							type="number"
							step="0.001"
							value={customSource}
							onChange={(event) => setCustomSource(event.target.value)}
						/>
					)}
				</div>
				<div className="field">
					<label htmlFor="fps-target">To (target FPS)</label>
					<FpsSelect id="fps-target" value={targetChoice} onChange={setTargetChoice} />
					{targetChoice === CUSTOM && (
						<input
							type="number"
							step="0.001"
							value={customTarget}
							onChange={(event) => setCustomTarget(event.target.value)}
						/>
					)}
				</div>
				<button className="btn" disabled={!isValid} onClick={() => onApply(sourceFps, targetFps)}>
					Convert
				</button>
			</div>
		</div>
	);
}

function FpsSelect({
	id,
	value,
	onChange,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
			{FPS_PRESETS.map((fps) => (
				<option key={fps} value={fps}>
					{fps}
				</option>
			))}
			<option value={CUSTOM}>Custom…</option>
		</select>
	);
}
