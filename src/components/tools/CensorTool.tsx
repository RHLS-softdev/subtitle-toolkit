import { useState } from "react";
import { DEFAULT_PROFANITY_WORDS } from "../../features/subtitle/censor";
import type { CensorMode } from "../../features/subtitle/censor";
import { AlertTriangleIcon, ChevronDownIcon } from "../icons/TablerIcons";

interface CensorToolProps {
	onApply: (words: string[], mode: CensorMode) => void;
}

function wordsFromText(text: string): string[] {
	return text
		.split(",")
		.map((w) => w.trim())
		.filter(Boolean);
}

export function CensorTool({ onApply }: CensorToolProps) {
	// The profanity list is pre-populated like before — it's mild, and
	// seeing what's already covered (and editing it directly) is the
	// point. The slur list stays separate and collapsed with nothing in
	// it: not because slurs are hidden from the app, but because no
	// default list is written into it at all — the user builds it by
	// hand — so nobody opens this tool and is confronted with one.
	const [profanityText, setProfanityText] = useState(DEFAULT_PROFANITY_WORDS.join(", "));
	const [slurText, setSlurText] = useState("");
	const [slursExpanded, setSlursExpanded] = useState(false);
	const [mode, setMode] = useState<CensorMode>("partial");

	const profanityWords = wordsFromText(profanityText);
	const slurWords = wordsFromText(slurText);
	const allWords = [...profanityWords, ...slurWords];

	return (
		<div className="tool-panel">
			<p className="help-text">
				Mask specific words across every line. This edits the subtitle text directly — download to keep the
				result, or use Reset changes above to undo it.
			</p>

			<div className="field">
				<label htmlFor="censor-profanity">Profanity to censor (comma-separated)</label>
				<textarea
					id="censor-profanity"
					rows={3}
					value={profanityText}
					onChange={(event) => setProfanityText(event.target.value)}
					style={{ fontFamily: "inherit", padding: "8px", border: "1px solid var(--color-border)", borderRadius: "6px" }}
				/>
			</div>

			<div className="censor-slur-section">
				<button
					type="button"
					className="censor-slur-toggle"
					onClick={() => setSlursExpanded((current) => !current)}
					aria-expanded={slursExpanded}
				>
					<ChevronDownIcon size={16} style={{ transform: slursExpanded ? "rotate(0deg)" : "rotate(-90deg)" }} />
					<AlertTriangleIcon size={16} />
					Slurs (separate list, collapsed by default)
				</button>

				{slursExpanded && (
					<div className="field censor-slur-field">
						<p className="help-text">
							This toolkit does not ship a slur list — there is no default to load here. Add your own
							words below, entirely by hand; they're censored the same way as the profanity list above,
							but kept separate so the two can never mix by accident.
						</p>
						<label htmlFor="censor-slurs">Slurs to censor (comma-separated)</label>
						<textarea
							id="censor-slurs"
							rows={3}
							placeholder="Add your own words here"
							value={slurText}
							onChange={(event) => setSlurText(event.target.value)}
							style={{ fontFamily: "inherit", padding: "8px", border: "1px solid var(--color-border)", borderRadius: "6px" }}
						/>
					</div>
				)}
			</div>

			<div className="field-row">
				<div className="field">
					<label>
						<input type="radio" name="censor-mode" checked={mode === "partial"} onChange={() => setMode("partial")} />{" "}
						Partial — "fuck" → "f***"
					</label>
					<label>
						<input type="radio" name="censor-mode" checked={mode === "full"} onChange={() => setMode("full")} />{" "}
						Full — "fuck" → "[____]"
					</label>
				</div>
				<button className="btn" disabled={allWords.length === 0} onClick={() => onApply(allWords, mode)}>
					Apply censoring
				</button>
			</div>
		</div>
	);
}
