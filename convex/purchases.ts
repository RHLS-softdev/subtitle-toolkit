import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireUser } from "./lib/plan";
import Stripe from "stripe";

/*
 * Purchases + the $9 checkout for Subtitle Toolkit Pro.
 *
 * Mirrors the Lingua Mundi commercial layer's checkout.ts (which came
 * from KitchenOS) with two differences that match this product's plan:
 *   - one-time payment (mode: "payment"), not a subscription — the
 *     pitch is "Pro for $9", a single purchase, no renewal;
 *   - keyed by Clerk user id (identity.subject), not org id — Subtitle
 *     Toolkit is per-user, there are no organizations.
 *
 * STRIPE_SECRET_KEY / STRIPE_PRO_PRICE_ID come from `npx convex env set`
 * (see SETUP.md). STRIPE_PRO_PRICE_ID is optional: if unset, the Checkout
 * Session uses an inline $9 price (unit_amount below), so the only
 * strictly required Stripe env var is the secret key.
 *
 * The Stripe webhook (http.ts) remains the ONLY path that creates a
 * purchase — this mutation only returns a Checkout URL, it never touches
 * the purchases table.
 */

/** Keep in sync with src/lib/pricing.ts (the frontend's display copy). */
export const PRO_PRICE_USD = 9;
export const PRO_PRODUCT = "subtitle-toolkit-pro";

export const getMyPurchases = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];
		return await ctx.db
			.query("purchases")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.collect();
	},
});

export const getMyEntitlements = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return { isPro: false, purchases: [] };

		const purchases = await ctx.db
			.query("purchases")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.collect();

		return {
			isPro: purchases.some((p) => p.product === PRO_PRODUCT),
			purchases,
		};
	},
});

export const createCheckoutSession = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await requireUser(ctx);

		const stripeSecret = process.env.STRIPE_SECRET_KEY;
		if (!stripeSecret) {
			throw new Error("STRIPE_SECRET_KEY is not set on this Convex deployment.");
		}
		const stripe = new Stripe(stripeSecret);

		const priceId = process.env.STRIPE_PRO_PRICE_ID;
		const lineItems = priceId
			? [{ price: priceId, quantity: 1 }]
			: [
					{
						price_data: {
							currency: "usd",
							product_data: {
								name: "Subtitle Toolkit Pro — one-time",
								description:
									"Batch processing, batch video extraction with ZIP output, and saved presets.",
							},
							unit_amount: PRO_PRICE_USD * 100,
						},
						quantity: 1,
					},
				];

		// DASHBOARD_URL is the app's origin; in dev the Vite app runs on
		// 5173. The webhook (not the redirect) is what actually grants
		// Pro, so these URLs only affect the UX after payment.
		const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:5173";
		const session = await stripe.checkout.sessions.create({
			mode: "payment",
			line_items: lineItems,
			success_url: `${dashboardUrl}/#pro`,
			cancel_url: `${dashboardUrl}/#pro`,
			metadata: { clerkUserId: identity.subject },
			client_reference_id: identity.subject,
		});

		return { url: session.url! };
	},
});

// Internal-only (called from http.ts) — the ONLY code path allowed to
// create a purchase. Idempotent per (clerkId, product): a repeated
// webhook delivery (Stripe retries, both products sharing one Stripe
// account, etc.) never creates duplicate rows.
export const recordPurchase = internalMutation({
	args: { clerkId: v.string(), product: v.string() },
	handler: async (ctx, { clerkId, product }) => {
		const existing = await ctx.db
			.query("purchases")
			.withIndex("by_clerk_product", (q) => q.eq("clerkId", clerkId).eq("product", product))
			.first();
		if (existing) return existing._id;

		return await ctx.db.insert("purchases", { clerkId, product, createdAt: Date.now() });
	},
});
