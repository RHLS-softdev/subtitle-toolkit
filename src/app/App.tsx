import { useState, lazy, Suspense } from "react";
import type { SubtitleDocument, SubtitleParseError } from "../features/subtitle/model";
import { parseSrt } from "../features/subtitle/parser";
import { shift, convertFps, correctDrift, splitCueLine } from "../features/subtitle/transforms";
import { decodeSubtitleBytes, detectBomEncoding } from "../features/subtitle/encoding";
import type { ImportEncodingLabel } from "../features/subtitle/encoding";
import { censorDocument } from "../features/subtitle/censor";
import { applyTransforms } from "../features/batch/batch";
import { readFileBytes } from "../lib/file";
import { usePro } from "./ProProvider";
import { t } from "../lib/i18n";
import { LangSwitcher } from "../components/LangSwitcher";
import { FileDrop } from "../components/FileDrop";
import { ErrorBanner } from "../components/ErrorBanner";
import { SubtitlePreview } from "../components/SubtitlePreview";
import { ToolTabs } from "../components/ToolTabs";
import type { ToolTabDef } from "../components/ToolTabs";
import { ValidationPanel } from "../components/ValidationPanel";
import { DownloadButton } from "../components/DownloadButton";
import { ShiftTool } from "../components/tools/ShiftTool";
import { FpsTool } from "../components/tools/FpsTool";
import { DriftTool } from "../components/tools/DriftTool";
import { EncodingTool } from "../components/tools/EncodingTool";
import { ExtractTool } from "../components/tools/ExtractTool";
import { CensorTool } from "../components/tools/CensorTool";
import { BatchTool } from "../components/tools/BatchTool";
import { BatchExtractTool } from "../components/tools/BatchExtractTool";
import { PresetsTool } from "../components/tools/PresetsTool";
import { DesktopPitch } from "../components/DesktopPitch";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { encodeSubtitleText } from "../features/subtitle/encoding";
import {
	FileTextIcon,
	ClockIcon,
	GaugeIcon,
	AdjustmentsHorizontalIcon,
	CircleCheckIcon,
	LanguageIcon,
	SubtitlesIcon,
	TrashIcon,
	EyeOffIcon,
	ExternalLinkIcon,
	RepeatIcon,
	ShieldLockIcon,
} from "../components/icons/TablerIcons";

// Lazy: Clerk + Convex only load when the Pro panel actually opens (the
// free tool never touches the commercial stack).
const ProPanel = lazy(() => import("../components/pro/ProPanel").then((m) => ({ default: m.ProPanel })));

type ToolId = "shift" | "fps" | "drift" | "validate" | "encoding" | "censor" | "presets";

const TOOL_TABS: ToolTabDef<ToolId>[] = [
	{ id: "shift", label: t("app.tab.shift"), icon: <ClockIcon size={16} /> },
	{ id: "fps", label: t("app.tab.fps"), icon: <GaugeIcon size={16} /> },
	{ id: "drift", label: t("app.tab.drift"), icon: <AdjustmentsHorizontalIcon size={16} /> },
	{ id: "censor", label: t("app.tab.censor"), icon: <EyeOffIcon size={16} /> },
	{ id: "validate", label: t("app.tab.validate"), icon: <CircleCheckIcon size={16} /> },
	{ id: "encoding", label: t("app.tab.encoding"), icon: <LanguageIcon size={16} /> },
	{ id: "presets", label: t("app.tab.presets"), icon: <RepeatIcon size={16} /> },
];

interface FriendlyError {
	message: string;
	detail?: string;
}

export function App() {
	const { entitlements, isPro, panelOpen, openPanel } = usePro();
	const [document, setDocument] = useState<SubtitleDocument | null>(null);
	const [originalDocument, setOriginalDocument] = useState<SubtitleDocument | null>(null);
	const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
	const [encoding, setEncoding] = useState<ImportEncodingLabel>("utf-8");
	const [addBom, setAddBom] = useState(false);
	const [error, setError] = useState<FriendlyError | null>(null);
	const [activeTool, setActiveTool] = useState<ToolId>("shift");
	const [showVideoExtract, setShowVideoExtract] = useState(false);
	const [highlightCueNumber, setHighlightCueNumber] = useState<number | null>(null);
	const [showFeedback, setShowFeedback] = useState(false);
	const [activeProTool, setActiveProTool] = useState<"batch" | "video" | null>(null);

	function loadFromBytes(bytes: ArrayBuffer, enc: ImportEncodingLabel, fileName: string | undefined) {
		try {
			const text = decodeSubtitleBytes(bytes, enc);
			const parsed = { ...parseSrt(text), sourceFileName: fileName };
			setDocument(parsed);
			setOriginalDocument(parsed);
			setError(null);
			setHighlightCueNumber(null);
		} catch (err) {
			setDocument(null);
			if (isSubtitleParseError(err)) {
				setError({ message: err.message, detail: err.detail });
			} else {
				setError({ message: "Couldn't read that file as a subtitle file.", detail: String(err) });
			}
		}
	}

	async function handleFile(file: File) {
		const bytes = await readFileBytes(file);
		const detected = detectBomEncoding(bytes) ?? "utf-8";
		setSourceBytes(bytes);
		setEncoding(detected);
		loadFromBytes(bytes, detected, file.name);
	}

	function handleRedecode(newEncoding: ImportEncodingLabel) {
		if (!sourceBytes) return;
		setEncoding(newEncoding);
		loadFromBytes(sourceBytes, newEncoding, document?.sourceFileName ?? originalDocument?.sourceFileName);
	}

	function handleReset() {
		setDocument(originalDocument);
	}

	function handleExtractedSrt(text: string, fileName: string) {
		const bytes = encodeSubtitleText(text);
		const buffer = bytes.buffer as ArrayBuffer;
		setSourceBytes(buffer);
		setEncoding("utf-8");
		setShowVideoExtract(false);
		loadFromBytes(buffer, "utf-8", fileName.replace(/\.[a-zA-Z0-9]+$/, ".srt"));
	}

	function handleClear() {
		setDocument(null);
		setOriginalDocument(null);
		setSourceBytes(null);
		setError(null);
	}

	function handleEditCueText(cueArrayIndex: number, newText: string) {
		if (!document) return;
		const cues = document.cues.slice();
		cues[cueArrayIndex] = { ...cues[cueArrayIndex], text: newText };
		setDocument({ ...document, cues });
	}

	return (
		<div className="app-shell">
			<header className="app-header">
				<SubtitlesIcon size={28} />
				<div>
					<h1>{t("app.title")}</h1>
					<p className="tagline">{t("app.tagline")}</p>
				</div>
				<button
					className={`btn-secondary btn pro-chip${isPro ? " is-pro" : ""}`}
					onClick={openPanel}
					title={isPro ? "Pro is active" : "Get Pro"}
				>
					{isPro ? <CircleCheckIcon size={16} /> : <ShieldLockIcon size={16} />}
					{isPro ? t("app.proBadge") : t("app.getPro")}
				</button>
				<button className="btn-secondary btn feedback-toggle" onClick={() => setShowFeedback((v) => !v)}>
					<ExternalLinkIcon size={16} />
					{t("app.feedback")}
				</button>
				<LangSwitcher />
			</header>

			{panelOpen && (
				<Suspense fallback={<div className="card pro-panel">Loading Pro…</div>}>
					<ProPanel />
				</Suspense>
			)}

			{showFeedback && <FeedbackPanel onClose={() => setShowFeedback(false)} />}

			<p className="privacy-note">🔒 {t("app.privacy")}</p>

			{error && <ErrorBanner message={error.message} detail={error.detail} />}

			{sourceBytes && !document && (
				<div className="card">
					<EncodingTool
						currentEncoding={encoding}
						addBom={addBom}
						onRedecode={handleRedecode}
						onAddBomChange={setAddBom}
					/>
				</div>
			)}

			{!document && !showVideoExtract && (
				<>
					<FileDrop onFile={handleFile} />
					<p className="help-text" style={{ textAlign: "center" }}>
						{t("app.videoExtract")}{" "}
						<button className="btn-secondary btn" onClick={() => setShowVideoExtract(true)}>
							{t("app.videoExtractBtn")}
						</button>
					</p>
				</>
			)}

			{!document && showVideoExtract && (
				<div className="card">
					<ExtractTool onExtracted={handleExtractedSrt} />
					<button className="btn-secondary btn" style={{ marginTop: "12px" }} onClick={() => setShowVideoExtract(false)}>
						{t("app.backToSrt")}
					</button>
				</div>
			)}

			{document && (
				<>
					<div className="card file-summary">
						<div className="file-meta">
							<FileTextIcon size={18} />
							<span>
								{document.sourceFileName ?? "subtitle.srt"} · {document.cues.length} cue
								{document.cues.length === 1 ? "" : "s"}
							</span>
						</div>
						<div style={{ display: "flex", gap: "8px" }}>
							{originalDocument && originalDocument !== document && (
								<button className="btn btn-secondary" onClick={handleReset}>
									Reset changes
								</button>
							)}
							<button className="btn btn-secondary" onClick={handleClear}>
								<TrashIcon size={16} />
								Load a different file
							</button>
							<DownloadButton document={document} addBom={addBom} label={t("app.download")} />
						</div>
					</div>

					<div className="card">
						<SubtitlePreview
							document={document}
							onEditCueText={handleEditCueText}
							highlightCueNumber={highlightCueNumber}
						/>
					</div>

					<div className="card">
						<ToolTabs tabs={TOOL_TABS} active={activeTool} onChange={setActiveTool} />
						<div style={{ marginTop: "16px" }}>
							{activeTool === "shift" && (
								<ShiftTool onApply={(offsetMs) => setDocument(shift(document, offsetMs))} />
							)}
							{activeTool === "fps" && (
								<FpsTool
									onApply={(source, target) => setDocument(convertFps(document, source, target))}
								/>
							)}
							{activeTool === "drift" && (
								<DriftTool
									onApply={(sStart, tStart, sEnd, tEnd) =>
										setDocument(correctDrift(document, sStart, tStart, sEnd, tEnd))
									}
								/>
							)}
							{activeTool === "censor" && (
								<CensorTool onApply={(words, mode) => setDocument(censorDocument(document, words, mode))} />
							)}
							{activeTool === "validate" && (
								<ValidationPanel
									document={document}
									onSelectCue={setHighlightCueNumber}
									onSplitLine={(cueIndex) => setDocument(splitCueLine(document, cueIndex))}
								/>
							)}
							{activeTool === "encoding" && (
								<EncodingTool
									currentEncoding={encoding}
									addBom={addBom}
									onRedecode={handleRedecode}
									onAddBomChange={setAddBom}
								/>
							)}
							{activeTool === "presets" &&
								(entitlements.savedPresets ? (
									<PresetsTool
										documentLoaded={document !== null}
										onApplyTransforms={(config) => setDocument(applyTransforms(document, config))}
									/>
								) : (
									<div className="locked-feature">
										<ShieldLockIcon size={20} />
										<p>
											<strong>Saved presets are a Pro feature.</strong> Name a transform config and
											re-apply it to any file in one click.
										</p>
										<button className="btn" onClick={openPanel}>
											Get Pro
										</button>
									</div>
								))}
						</div>
					</div>
				</>
			)}

			{entitlements.batchProcessing && (
				<div className="card pro-tools-card">
					<div className="pro-tool-header">
						<h2>Pro tools</h2>
						<p className="help-text">
							Everything below runs locally in your browser — nothing is uploaded.
						</p>
					</div>
					<div className="pro-tool-buttons">
						<button className="btn-secondary btn" onClick={() => setActiveProTool(activeProTool === "batch" ? null : "batch")}>
							Batch process .srt files
						</button>
						<button className="btn-secondary btn" onClick={() => setActiveProTool(activeProTool === "video" ? null : "video")}>
							Batch extract from video
						</button>
					</div>
					{activeProTool === "batch" && <BatchTool onBack={() => setActiveProTool(null)} />}
					{activeProTool === "video" && <BatchExtractTool onBack={() => setActiveProTool(null)} />}
				</div>
			)}

			<DesktopPitch />

			<footer className="app-footer">
				Free for single-file, browser-side subtitle processing. No account needed. Pro unlocks batch tools and
				saved presets.
			</footer>
		</div>
	);
}

function isSubtitleParseError(err: unknown): err is SubtitleParseError {
	return err instanceof Error && err.name === "SubtitleParseError";
}
