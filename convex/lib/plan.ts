import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";

/*
 * The one security helper for the commercial layer. Subtitle Toolkit has
 * no server-side processing, so unlike Lingua Mundi there is no
 * requireProAccount gate on any mutation — the ONLY things Convex does
 * are (1) record that a purchase happened (webhook-only) and (2) let the
 * client read its own entitlements. The client-side entitlement boundary
 * lives in src/lib/entitlements.ts; the server-side invariant that backs
 * it is "a purchase row can only be created by the Stripe webhook".
 */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new ConvexError({ code: 401, message: "Sign in required." });
	}
	return identity;
}
