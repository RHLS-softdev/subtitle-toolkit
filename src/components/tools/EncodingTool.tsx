import { useState } from "react";
import { SUPPORTED_IMPORT_ENCODINGS } from "../../features/subtitle/encoding";
import type { ImportEncodingLabel } from "../../features/subtitle/encoding";

interface EncodingToolProps {
	currentEncoding: ImportEncodingLabel;
	addBom: boolean;
	onRedecode: (encoding: ImportEncodingLabel) => void;
	onAddBomChange: (addBom: boolean) => void;
}

export function EncodingTool({ currentEncoding, addBom, onRedecode, onAddBomChange }: EncodingToolProps) {
	const [selected, setSelected] = useState<ImportEncodingLabel>(currentEncoding);

	return (
		<div className="tool-panel">
			<p className="help-text">
				If the preview above shows garbled characters (mojibake) instead of the text you expect, the file was
				probably saved in a different encoding than UTF-8. Try re-reading it as one of these:
			</p>
			<div className="field-row">
				<div className="field">
					<label htmlFor="encoding-select">Read file as</label>
					<select
						id="encoding-select"
						value={selected}
						onChange={(event) => setSelected(event.target.value as ImportEncodingLabel)}
					>
						{SUPPORTED_IMPORT_ENCODINGS.map((enc) => (
							<option key={enc.label} value={enc.label}>
								{enc.name}
							</option>
						))}
					</select>
				</div>
				<button className="btn" onClick={() => onRedecode(selected)}>
					Re-read file
				</button>
			</div>
			<label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
				<input type="checkbox" checked={addBom} onChange={(event) => onAddBomChange(event.target.checked)} />
				Add a UTF-8 BOM to the downloaded file (needed by some older Windows players)
			</label>
		</div>
	);
}
