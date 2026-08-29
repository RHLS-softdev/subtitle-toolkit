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
 */
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
				await ctx.runMutation(internal.purchases.recordPurchase, {
					clerkId: clerkUserId,
					product: "subtitle-toolkit-pro",
				});
			}
		}

		return new Response(null, { status: 200 });
	}),
});

export default http;
