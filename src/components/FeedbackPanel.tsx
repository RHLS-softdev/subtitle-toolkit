import { useState } from "react";
import { ExternalLinkIcon, XIcon } from "./icons/TablerIcons";

const FEEDBACK_EMAIL = "rhls.softdev@gmail.com";

/**
 * A small feedback form that hands off to the user's own email client via
 * a mailto: link — there's no backend here to receive a submission (this
 * app doesn't send anything anywhere on its own; see the privacy note in
 * the header), so "sending" feedback means opening a pre-filled draft in
 * whatever mail app is already set up on the device.
 */
export function FeedbackPanel({ onClose }: { onClose: () => void }) {
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");

	const mailtoHref = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
		subject || "Subtitle Toolkit feedback",
	)}&body=${encodeURIComponent(message)}`;

	return (
		<div className="card feedback-panel">
			<div className="feedback-panel-header">
				<h2>Send feedback</h2>
				<button className="btn-secondary btn" onClick={onClose} aria-label="Close feedback form">
					<XIcon size={16} />
				</button>
			</div>
			<p className="help-text">
				This opens a draft in your own email app, addressed to {FEEDBACK_EMAIL} — nothing is collected or
				sent from here directly.
			</p>
			<div className="field">
				<label htmlFor="feedback-subject">Subject</label>
				<input
					id="feedback-subject"
					type="text"
					placeholder="Subtitle Toolkit feedback"
					value={subject}
					onChange={(event) => setSubject(event.target.value)}
				/>
			</div>
			<div className="field">
				<label htmlFor="feedback-message">Message</label>
				<textarea
					id="feedback-message"
					rows={5}
					placeholder="What worked, what didn't, what you'd like to see..."
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					style={{ fontFamily: "inherit", padding: "8px", border: "1px solid var(--color-border)", borderRadius: "6px" }}
				/>
			</div>
			<a className="btn" href={mailtoHref}>
				<ExternalLinkIcon size={16} />
				Open email draft
			</a>
		</div>
	);
}
