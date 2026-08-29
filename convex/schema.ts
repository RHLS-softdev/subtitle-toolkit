import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/*
 * Subtitle Toolkit commercial layer — the ONLY backend the app talks to,
 * and never for media: Convex holds users/purchases/entitlements, never
 * subtitle or video bytes (hard architectural rule: a subtitle file or
 * video never touches Convex — all processing is local in the browser).
 *
 * Schema follows the "Sloth Stack" plan's section 13 almost verbatim:
 * users + purchases, both keyed by Clerk user id. Plan/entitlement is
 * derived from purchases (product = "subtitle-toolkit-pro") — there is
 * no client-supplied plan field, and the only code path that can insert
 * a purchase is the Stripe webhook (http.ts -> internal.purchases.
 * recordPurchase), never a mutation callable from the browser.
 */
export default defineSchema({
	users: defineTable({
		clerkId: v.string(),
		createdAt: v.number(),
	}).index("by_clerk_id", ["clerkId"]),

	// One row per completed $9 Pro purchase. A user with at least one
	// row whose product === "subtitle-toolkit-pro" is Pro.
	purchases: defineTable({
		clerkId: v.string(),
		product: v.string(),
		createdAt: v.number(),
	})
		.index("by_clerk_id", ["clerkId"])
		.index("by_clerk_product", ["clerkId", "product"]),
});
