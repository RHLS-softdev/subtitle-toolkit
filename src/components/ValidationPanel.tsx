import { useMemo, useState } from "react";
import type { SubtitleDocument } from "../features/subtitle/model";
import { validateSrt, LINE_LENGTH_GUIDELINES } from "../features/subtitle/validator";
import { AlertTriangleIcon, CircleCheckIcon, AdjustmentsHorizontalIcon } from "./icons/TablerIcons";

interface ValidationPanelProps {
	document: SubtitleDocument;
	onSelectCue: (cueIndex: number) => void;
	onSplitLine: (cueIndex: number) => void;
}

export function ValidationPanel({ document, onSelectCue, onSplitLine }: ValidationPanelProps) {
	const [guidelineId, setGuidelineId] = useState(LINE_LENGTH_GUIDELINES[0].id);
	const guideline = LINE_LENGTH_GUIDELINES.find((g) => g.id === guidelineId) ?? LINE_LENGTH_GUIDELINES[0];
	const warnings = useMemo(() => validateSrt(document, guideline), [document, guideline]);

	return (
		<div className="warning-list">
			<div className="field">
				<label htmlFor="validation-guideline">Line-length guideline</label>
				<select
					id="validation-guideline"
					value={guidelineId}
					onChange={(event) => setGuidelineId(event.target.value)}
				>
					{LINE_LENGTH_GUIDELINES.map((g) => (
						<option key={g.id} value={g.id}>
							{g.label} — {g.maxLineCharacters} chars/line, {g.maxDisplayLines} lines
						</option>
					))}
				</select>
				<p className="help-text">{guideline.source}</p>
			</div>

			{warnings.length === 0 ? (
				<div className="status-clean">
					<CircleCheckIcon size={18} />
					No issues found against {guideline.label}.
				</div>
			) : (
				<>
					<p className="help-text">
						{warnings.length} warning{warnings.length === 1 ? "" : "s"}. These are worth a look, but won't
						stop you from downloading. Click one to jump to that line.
					</p>
					{warnings.map((warning, i) => (
						<div className="warning-item" key={i}>
							<button className="warning-item-main" onClick={() => onSelectCue(warning.cueIndex)}>
								<AlertTriangleIcon size={16} />
								<span>
									<strong>Subtitle {warning.cueIndex}:</strong> {warning.message}
									<br />
									<span className="warning-suggestion">→ {warning.suggestion}</span>
								</span>
							</button>
							{warning.canAutoSplit && (
								<button
									className="btn btn-secondary warning-split-btn"
									onClick={(event) => {
										event.stopPropagation();
										onSplitLine(warning.cueIndex);
									}}
								>
									<AdjustmentsHorizontalIcon size={14} />
									Split line
								</button>
							)}
						</div>
					))}
				</>
			)}
		</div>
	);
}
