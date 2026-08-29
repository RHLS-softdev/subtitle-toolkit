import { useEffect, useRef, useState } from "react";
import type { SubtitleDocument } from "../features/subtitle/model";
import { msToTimestamp } from "../features/subtitle/parser";
import { GripVerticalIcon } from "./icons/TablerIcons";

interface SubtitlePreviewProps {
	document: SubtitleDocument;
	onEditCueText: (cueArrayIndex: number, newText: string) => void;
	/** The .index (printed cue number) to scroll to and highlight, e.g. from a clicked validation warning. */
	highlightCueNumber?: number | null;
}

// Drag payload used by drop targets like DriftTool's "currently at" fields.
export const CUE_DRAG_MIME = "application/x-subtitle-cue";

export interface CueDragPayload {
	startMs: number;
	endMs: number;
}

export function SubtitlePreview({ document, onEditCueText, highlightCueNumber }: SubtitlePreviewProps) {
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [draftText, setDraftText] = useState("");
	const itemRefs = useRef<Map<number, HTMLLIElement>>(new Map());

	useEffect(() => {
		if (highlightCueNumber == null) return;
		const arrayIndex = document.cues.findIndex((cue) => cue.index === highlightCueNumber);
		const el = itemRefs.current.get(arrayIndex);
		el?.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [highlightCueNumber, document.cues]);

	function commitEdit(i: number) {
		onEditCueText(i, draftText);
		setEditingIndex(null);
	}

	return (
		<div className="subtitle-preview">
			<ol>
				{document.cues.map((cue, i) => (
					<li
						key={i}
						ref={(el) => {
							if (el) itemRefs.current.set(i, el);
							else itemRefs.current.delete(i);
						}}
						draggable={editingIndex !== i}
						onDragStart={(event) => {
							const payload: CueDragPayload = { startMs: cue.startMs, endMs: cue.endMs };
							event.dataTransfer.setData(CUE_DRAG_MIME, JSON.stringify(payload));
							event.dataTransfer.setData("text/plain", msToTimestamp(cue.startMs));
							event.dataTransfer.effectAllowed = "copy";

							// Browsers render the native drag ghost at a washed-out, near-
							// invisible opacity by default, which makes the line unreadable
							// while you're dragging it. Supplying our own fully-opaque
							// drag image (a solid-background clone, positioned off-screen)
							// fixes that. The clone is removed on the next frame, once the
							// browser has taken its snapshot for the drag preview.
							const source = event.currentTarget;
							const preview = source.cloneNode(true) as HTMLElement;
							preview.style.position = "absolute";
							preview.style.top = "-9999px";
							preview.style.left = "-9999px";
							preview.style.width = `${source.offsetWidth}px`;
							preview.style.background = "var(--color-surface)";
							preview.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.25)";
							preview.style.opacity = "1";
							// `document` here is this component's prop (the subtitle
							// document), not the DOM global — go through `window` to
							// reach the real document and avoid the name collision.
							window.document.body.appendChild(preview);
							event.dataTransfer.setDragImage(preview, 20, 20);
							requestAnimationFrame(() => preview.remove());
						}}
						title="Drag this line onto a time field to fill it in"
						className={cue.index === highlightCueNumber ? "is-highlighted" : undefined}
					>
						<GripVerticalIcon size={14} className="cue-grip" />
						<span className="cue-number">{i + 1}</span>
						<span className="cue-time">
							{msToTimestamp(cue.startMs)}
							{" → "}
							{msToTimestamp(cue.endMs)}
						</span>
						{editingIndex === i ? (
							<textarea
								className="cue-text-edit"
								autoFocus
								draggable={false}
								value={draftText}
								onChange={(event) => setDraftText(event.target.value)}
								onBlur={() => commitEdit(i)}
								onKeyDown={(event) => {
									if (event.key === "Escape") setEditingIndex(null);
									if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) commitEdit(i);
								}}
								onMouseDown={(event) => event.stopPropagation()}
							/>
						) : (
							<span
								className="cue-text"
								onClick={() => {
									setEditingIndex(i);
									setDraftText(cue.text);
								}}
								title="Click to edit"
							>
								{cue.text || <em>(empty)</em>}
							</span>
						)}
					</li>
				))}
			</ol>
		</div>
	);
}
