import { useState } from "react";
import type { DragEvent } from "react";
import { CUE_DRAG_MIME } from "../SubtitlePreview";
import type { CueDragPayload } from "../SubtitlePreview";
import { formatFriendlyTimestamp, parseFlexibleTimestamp } from "../../features/subtitle/parser";

interface DriftToolProps {
	onApply: (sourceStartMs: number, targetStartMs: number, sourceEndMs: number, targetEndMs: number) => void;
}

type SourceField = "start" | "end";

// All four fields share one normalized format ("M:SS.mmm", or
// "H:MM:SS.mmm" once an hour is needed) — typed by hand, filled in by
// dragging a line from the preview, it doesn't matter which; the field
// always shows the same shape. Previously only values arriving through
// one path ended up formatted this way, which is what made drift
// correction confusing to read.
const ZERO = formatFriendlyTimestamp(0);

export function DriftTool({ onApply }: DriftToolProps) {
	const [sourceStart, setSourceStart] = useState(ZERO);
	const [targetStart, setTargetStart] = useState(ZERO);
	const [sourceEnd, setSourceEnd] = useState(ZERO);
	const [targetEnd, setTargetEnd] = useState(ZERO);
	const [dropTarget, setDropTarget] = useState<SourceField | null>(null);

	const parsedValues = [sourceStart, targetStart, sourceEnd, targetEnd].map(parseFlexibleTimestamp);
	const isValid = parsedValues.every((v): v is number => v !== null) && parsedValues[0] !== parsedValues[2];

	function handleDrop(field: SourceField, event: DragEvent<HTMLInputElement>) {
		event.preventDefault();
		setDropTarget(null);

		const raw = event.dataTransfer.getData(CUE_DRAG_MIME);
		if (!raw) return;

		const payload = JSON.parse(raw) as CueDragPayload;
		// A line's start naturally maps to a "start" sync point, its end to an "end" one.
		const ms = field === "start" ? payload.startMs : payload.endMs;
		const formatted = formatFriendlyTimestamp(ms);

		if (field === "start") setSourceStart(formatted);
		else setSourceEnd(formatted);
	}

	function dropProps(field: SourceField) {
		return {
			onDragOver: (event: DragEvent<HTMLInputElement>) => {
				if (event.dataTransfer.types.includes(CUE_DRAG_MIME)) {
					event.preventDefault();
					setDropTarget(field);
				}
			},
			onDragLeave: () => setDropTarget((current) => (current === field ? null : current)),
			onDrop: (event: DragEvent<HTMLInputElement>) => handleDrop(field, event),
		};
	}

	function handleApply() {
		const [sStart, tStart, sEnd, tEnd] = parsedValues;
		if (sStart === null || tStart === null || sEnd === null || tEnd === null) return;
		onApply(sStart, tStart, sEnd, tEnd);
	}

	return (
		<div className="tool-panel">
			<p className="help-text">
				Pick two moments where you know the subtitle is out of sync — usually the first and last line of
				dialogue — and give the time each one <em>should</em> appear at. Every other line is corrected
				proportionally between them. Times are written as minutes:seconds, e.g. <code>1:05.300</code> (add
				an hours column, <code>1:02:05.300</code>, for anything past an hour in).
			</p>
			<p className="help-text">
				<strong>Tip:</strong> drag a line from the preview above onto a "currently at" field to fill it in —
				no need to type the timestamp yourself.
			</p>
			<div className="field-row">
				<div className="field">
					<label htmlFor="drift-source-start">First line: currently at</label>
					<input
						id="drift-source-start"
						type="text"
						inputMode="decimal"
						placeholder={ZERO}
						value={sourceStart}
						onChange={(event) => setSourceStart(event.target.value)}
						className={dropTarget === "start" ? "is-drop-target" : undefined}
						{...dropProps("start")}
					/>
				</div>
				<div className="field">
					<label htmlFor="drift-target-start">…should be at</label>
					<input
						id="drift-target-start"
						type="text"
						inputMode="decimal"
						placeholder={ZERO}
						value={targetStart}
						onChange={(event) => setTargetStart(event.target.value)}
					/>
				</div>
			</div>
			<div className="field-row">
				<div className="field">
					<label htmlFor="drift-source-end">Last line: currently at</label>
					<input
						id="drift-source-end"
						type="text"
						inputMode="decimal"
						placeholder={ZERO}
						value={sourceEnd}
						onChange={(event) => setSourceEnd(event.target.value)}
						className={dropTarget === "end" ? "is-drop-target" : undefined}
						{...dropProps("end")}
					/>
				</div>
				<div className="field">
					<label htmlFor="drift-target-end">…should be at</label>
					<input
						id="drift-target-end"
						type="text"
						inputMode="decimal"
						placeholder={ZERO}
						value={targetEnd}
						onChange={(event) => setTargetEnd(event.target.value)}
					/>
				</div>
				<button className="btn" disabled={!isValid} onClick={handleApply}>
					Correct drift
				</button>
			</div>
		</div>
	);
}
