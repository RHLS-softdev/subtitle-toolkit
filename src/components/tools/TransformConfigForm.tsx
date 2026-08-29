import { SUPPORTED_IMPORT_ENCODINGS } from "../../features/subtitle/encoding";
import type { ImportEncodingLabel } from "../../features/subtitle/encoding";
import type { BatchTransformConfig } from "../../features/batch/batch";
import type { CensorMode } from "../../features/subtitle/censor";

/*
 * Shared editor for a BatchTransformConfig — used by the batch tool and
 * by the saved-presets tool, so a preset is literally a named batch
 * config. Pure controlled component: parent owns the config state.
 */
interface TransformConfigFormProps {
	config: BatchTransformConfig;
	onChange: (config: BatchTransformConfig) => void;
}

export function TransformConfigForm({ config, onChange }: TransformConfigFormProps) {
	function patch(p: Partial<BatchTransformConfig>) {
		onChange({ ...config, ...p });
	}

	function handleCensorWords(text: string) {
		// Accept both comma-separated and line-separated input.
		patch({ censorWords: text.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean) });
	}

	return (
		<div className="transform-config">
			<div className="field-row">
				<div className="field">
					<label htmlFor="bc-shift">Shift by (seconds, negative = earlier)</label>
					<input
						id="bc-shift"
						type="number"
						step="0.5"
						value={config.shiftSeconds}
						onChange={(e) => patch({ shiftSeconds: Number(e.target.value) || 0 })}
					/>
				</div>
			</div>

			<div className="field-row">
				<div className="field">
					<label htmlFor="bc-fps-src">Source FPS (0 = skip conversion)</label>
					<input
						id="bc-fps-src"
						type="number"
						step="0.001"
						min="0"
						value={config.fpsSource || ""}
						placeholder="e.g. 23.976"
						onChange={(e) => patch({ fpsSource: Number(e.target.value) || 0 })}
					/>
				</div>
				<div className="field">
					<label htmlFor="bc-fps-tgt">Target FPS</label>
					<input
						id="bc-fps-tgt"
						type="number"
						step="0.001"
						min="0"
						value={config.fpsTarget || ""}
						placeholder="e.g. 25"
						onChange={(e) => patch({ fpsTarget: Number(e.target.value) || 0 })}
					/>
				</div>
			</div>

			<div className="field-row">
				<div className="field">
					<label htmlFor="bc-censor">Censor words (comma or line separated)</label>
					<textarea
						id="bc-censor"
						rows={2}
						value={config.censorWords.join(", ")}
						onChange={(e) => handleCensorWords(e.target.value)}
					/>
				</div>
				<div className="field">
					<label htmlFor="bc-censor-mode">Censor style</label>
					<select
						id="bc-censor-mode"
						value={config.censorMode}
						onChange={(e) => patch({ censorMode: e.target.value as CensorMode })}
					>
						<option value="full">Mask whole word ([____])</option>
						<option value="partial">Keep first letter (f***)</option>
					</select>
				</div>
			</div>

			<div className="field">
				<label htmlFor="bc-encoding">Re-decode input as</label>
				<select
					id="bc-encoding"
					value={config.encoding}
					onChange={(e) => patch({ encoding: e.target.value as ImportEncodingLabel })}
				>
					{SUPPORTED_IMPORT_ENCODINGS.map((enc) => (
						<option key={enc.label} value={enc.label}>
							{enc.name}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
