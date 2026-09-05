import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

/*
 * Stripe webhook — the ONLY code path in the entire system allowed to
 * grant Pro (same hard rule as Lingua Mundi's commercial/http.ts and
 * KitchenOS before it): a purchase row can only ever come from Stripe
 * actually confirming payment.
 *
 * Point your Stripe webhook (Dashboard -> Developers -> Webhooks) at:
 *   https://<this-deployment>.convex.site/stripe/webhook
 * Events to send: checkout.session.completed
 *
 * STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set via
 * `npx convex env set` — see SETUP.md. Never hardcode them.
 *
 * Two grant paths, both webhook-only:
 *   1. App-initiated checkout — the frontend passes clerkUserId through
 *      Checkout Session metadata (convex/purchases.ts).
 *   2. Payment Link / bundle purchase — no metadata is available, so the
 *      buyer's email (Stripe always collects it) is resolved to a Clerk
 *      user via the Clerk API. CLERK_SECRET_KEY must be set for this to
 *      work; without it, bundle grants are skipped (logged).
 *
 * Bundle mapping (grant = underlying product entitlement, never a
 * "bundle" flag): the Complete Bundle ($49, price_1UA08VHWfIhAnbX5WGSrPmQi)
 * includes Subtitle Toolkit Pro, so its price grants this product.
 * The Language ($44) and Creator ($19/mo) bundles do NOT include ST Pro.
 */

/** Price IDs that grant Subtitle Toolkit Pro. */
const GRANTING_PRICE_IDS = new Set<string>([
	// ST Pro one-time (STRIPE_PRO_PRICE_ID, also read from env below)
	// Complete Bundle $49 one-time — includes ST Pro
	"price_1UA08VHWfIhAnbX5WGSrPmQi",
]);

/** Resolve an email to a Clerk user id via the Clerk API, or null. */
async function resolveClerkUserIdByEmail(email: string): Promise<string | null> {
	const key = process.env.CLERK_SECRET_KEY;
	if (!key) {
		console.error("BUNDLE_GRANT_SKIPPED no CLERK_SECRET_KEY set");
		return null;
	}
	try {
		const res = await fetch(
			`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
			{ headers: { Authorization: `Bearer ${key}` } },
		);
		if (!res.ok) {
			console.error("BUNDLE_GRANT_CLERK_LOOKUP_FAILED", res.status);
			return null;
		}
		const body: unknown = await res.json();
		const users = Array.isArray(body)
			? (body as { id: string }[])
			: ((body as { data?: { id: string }[] }).data ?? []);
		return users[0]?.id ?? null;
	} catch (e: any) {
		console.error("BUNDLE_GRANT_CLERK_ERROR", e?.message ?? String(e));
		return null;
	}
}

const http = httpRouter();

http.route({
	path: "/stripe/webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
		const signature = request.headers.get("stripe-signature")!;
		const body = await request.text();

		let event: Stripe.Event;
		try {
			event = await stripe.webhooks.constructEventAsync(
				body,
				signature,
				process.env.STRIPE_WEBHOOK_SECRET!,
			);
		} catch (e: any) {
			return new Response("Webhook signature verification failed", { status: 400 });
		}

		if (event.type === "checkout.session.completed") {
			const session = event.data.object as Stripe.Checkout.Session;
			// clerkUserId is passed through as Checkout Session metadata
			// when the frontend creates the session (convex/purchases.ts).
			const clerkUserId = session.metadata?.clerkUserId;

			if (clerkUserId) {
				// Path 1: app-initiated checkout — grant as before.
				await ctx.runMutation(internal.purchases.recordPurchase, {
					clerkId: clerkUserId,
					product: "subtitle-toolkit-pro",
				});
			} else {
				// Path 2: Payment Link / bundle purchase — no metadata.
				// Resolve who bought it from the email Stripe collected.
				// Retrieve the full session (email + line items) — the
				// event payload only carries a subset of the session.
				let full: Stripe.Checkout.Session | null = null;
				try {
					full = await stripe.checkout.sessions.retrieve(session.id, {
						expand: ["line_items.data.price"],
					});
				} catch (e: any) {
					console.error("BUNDLE_GRANT_RETRIEVE_FAILED", e?.message ?? String(e));
				}
				if (!full) {
					return new Response(null, { status: 200 });
				}

				const email = full.customer_details?.email ?? full.customer_email ?? null;
				if (!email) {
					console.error("BUNDLE_GRANT_SKIPPED no email on session", session.id);
					return new Response(null, { status: 200 });
				}

				// Figure out which price(s) were paid.
				const priceIds =
					full.line_items?.data
						.map((li) => li.price?.id)
						.filter((id): id is string => !!id) ?? [];

				const grantsSt =
					priceIds.some((id) => GRANTING_PRICE_IDS.has(id)) ||
					(process.env.STRIPE_PRO_PRICE_ID
						? priceIds.includes(process.env.STRIPE_PRO_PRICE_ID)
						: false);
				if (!grantsSt) {
					console.error("BUNDLE_GRANT_SKIPPED no ST-granting price", priceIds);
					return new Response(null, { status: 200 });
				}

				const resolvedUser = await resolveClerkUserIdByEmail(email);
				if (!resolvedUser) {
					console.error("BUNDLE_GRANT_NO_CLERK_USER", email);
					return new Response(null, { status: 200 });
				}

				await ctx.runMutation(internal.purchases.recordPurchase, {
					clerkId: resolvedUser,
					product: "subtitle-toolkit-pro",
				});
			}
		}

		return new Response(null, { status: 200 });
	}),
});

export default http;
