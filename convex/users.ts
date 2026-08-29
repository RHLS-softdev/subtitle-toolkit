import { mutation } from "./_generated/server";

/*
 * Registers the Clerk user the first time they touch the commercial
 * layer. Called by the frontend right after sign-in (see ProContent).
 * Idempotent — a repeat sign-in just returns the existing row's id.
 * Purchases (the actual entitlement) live in their own table and are
 * only ever written by the Stripe webhook, not here.
 */
export const ensureUser = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;

		const clerkId = identity.subject;
		const existing = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
			.unique();
		if (existing) return existing._id;

		return await ctx.db.insert("users", { clerkId, createdAt: Date.now() });
	},
});
