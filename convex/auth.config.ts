// Tells Convex to trust JWTs issued by your Clerk instance — the same
// pattern as the Lingua Mundi commercial layer's auth.config.ts (which
// itself came from KitchenOS). Convex reads this file per-deployment, so
// it has to exist in every project even when two products share one
// Clerk application (see SETUP.md: Subtitle Toolkit and Lingua Mundi can
// share the Clerk app "lovely-gobbler-9439", so this issuer domain is
// the same value either way).
//
// CLERK_JWT_ISSUER_DOMAIN is set via `npx convex env set` (see SETUP.md).
// Requires a Clerk JWT template named exactly "convex" in the Clerk
// dashboard (JWT Templates -> New -> Convex preset) — the Lingua Mundi
// app already has one.
export default {
	providers: [
		{
			domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
			applicationID: "convex",
		},
	],
};
