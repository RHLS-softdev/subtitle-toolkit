import { useState } from "react";
import type { BatchTransformConfig } from "../../features/batch/batch";
import { defaultBatchConfig } from "../../features/batch/batch";
import {
	createPreset,
	describeConfig,
	loadPresets,
	savePresets,
	type SubtitlePreset,
} from "../../features/presets/presets";
import { TransformConfigForm } from "./TransformConfigForm";
import { RepeatIcon, TrashIcon } from "../icons/TablerIcons";

/*
 * Pro saved-presets tool: name a transform config once, re-apply it to
 * the loaded document (or reuse it in the batch tool) with one click.
 * Stored in localStorage — settings only, never file contents (see
 * src/features/presets/presets.ts for the privacy note).
 */

interface PresetsToolProps {
	/** Whether a document is currently loaded (Apply is disabled otherwise). */
	documentLoaded: boolean;
	onApplyTransforms: (config: BatchTransformConfig) => void;
}

export function PresetsTool({ documentLoaded, onApplyTransforms }: PresetsToolProps) {
	const [presets, setPresets] = useState<SubtitlePreset[]>(() => loadPresets());
	const [name, setName] = useState("");
	const [config, setConfig] = useState<BatchTransformConfig>(defaultBatchConfig);
	const [message, setMessage] = useState<string | null>(null);

	function persist(next: SubtitlePreset[]) {
		setPresets(next);
		savePresets(next);
	}

	function handleSave() {
		const trimmed = name.trim();
		if (!trimmed) {
			setMessage("Give the preset a name first.");
			return;
		}
		persist([...presets, createPreset(trimmed, config)]);
		setName("");
		setMessage(`Saved "${trimmed}".`);
	}

	function handleApply(preset: SubtitlePreset) {
		if (!documentLoaded) return;
		onApplyTransforms(preset.config);
		setMessage(`Applied "${preset.name}".`);
	}

	function handleDelete(id: string) {
		persist(presets.filter((p) => p.id !== id));
	}

	return (
		<div className="pro-tool">
			<div className="pro-tool-header">
				<h3>Saved presets</h3>
			</div>

			{presets.length === 0 && <p className="help-text">No presets yet — save a transform config below.</p>}

			<ul className="preset-list">
				{presets.map((preset) => (
					<li key={preset.id}>
						<div className="preset-info">
							<strong>{preset.name}</strong>
							<span className="preset-summary">{describeConfig(preset.config)}</span>
						</div>
						<div className="preset-actions">
							<button
								className="btn-secondary btn"
								disabled={!documentLoaded}
								title={documentLoaded ? "Apply to the loaded subtitle" : "Load a subtitle file first"}
								onClick={() => handleApply(preset)}
							>
								<RepeatIcon size={14} /> Apply
							</button>
							<button
								className="btn-secondary btn"
								aria-label={`Delete preset ${preset.name}`}
								onClick={() => handleDelete(preset.id)}
							>
								<TrashIcon size={14} />
							</button>
						</div>
					</li>
				))}
			</ul>

			<div className="preset-form">
				<h4>Save a new preset</h4>
				<div className="field">
					<label htmlFor="preset-name">Preset name</label>
					<input
						id="preset-name"
						type="text"
						value={name}
						placeholder="e.g. 23.976→25 clean-up"
						onChange={(e) => setName(e.target.value)}
					/>
				</div>
				<TransformConfigForm config={config} onChange={setConfig} />
				<div className="pro-actions">
					<button className="btn" onClick={handleSave}>
						Save preset
					</button>
				</div>
				{message && <p className="help-text">{message}</p>}
			</div>
		</div>
	);
}
