# Subtitle Toolkit Pro — backend setup (Convex + Clerk + Stripe)

The Pro commercial layer follows the Lingua Mundi pattern (same Convex +
Clerk + Stripe architecture, see `lingua-mundi/commercial/README.md`).
**All subtitle/video processing stays in the browser** — Convex only
stores users + purchases, Clerk only handles accounts, Stripe only takes
the $9 payment. Files never leave the device.

What exists already:

- `convex/` — deploy-ready backend: `schema.ts` (users, purchases),
  `auth.config.ts` (Clerk JWT), `users.ts` / `purchases.ts` (entitlement
  queries + `createCheckoutSession`), `http.ts` (Stripe webhook). The
  webhook is the ONLY path that grants Pro.
- Frontend wired via `.env.local` (`VITE_CLERK_PUBLISHABLE_KEY`,
  `VITE_CONVEX_URL`). Until the deployment below exists, the app runs
  fine and the Pro panel shows "store not connected" instead of breaking.

## 1. Convex deployment (the only real prerequisite)

```bash
npm install            # if you haven't already
npx convex login       # opens the browser once; authorize your Convex account
npx convex deploy      # creates/deploys to the project; generates convex/_generated
```

Then copy the deployment URL (e.g. `https://something.convex.cloud`)
into `.env.local` as `VITE_CONVEX_URL` and rebuild the frontend.

Set the backend env vars:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://lovely-gobbler-9439.clerk.accounts.dev
npx convex env set STRIPE_SECRET_KEY sk_test_...
npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
npx convex env set DASHBOARD_URL https://rhls-softdev.github.io/subtitle-toolkit-launch/app
# optional: a saved Stripe Price for the $9 Pro purchase; if unset the
# checkout uses an inline $9 one-time price (see convex/purchases.ts)
npx convex env set STRIPE_PRO_PRICE_ID price_...
```

## 2. Clerk

- The app shares the existing Clerk application with Lingua Mundi
  (`lovely-gobbler-9439`) — one identity works across both products, so
  no new Clerk app is needed.
- The "convex" JWT template already exists there (Lingua Mundi uses it).
- `auth.config.ts` needs `CLERK_JWT_ISSUER_DOMAIN` to match that Clerk
  app's issuer (step 1) — the value above is the current one.
- Register the deployed app origin in Clerk (Dashboard -> Security ->
  Allowed origins, or with the API):

```bash
curl -X PATCH https://api.clerk.com/v1/instance \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"allowed_origins":["https://rhls-softdev.github.io/subtitle-toolkit-launch/app/"]}'
```

(The deploy script runs this automatically when `CLERK_SECRET_KEY` is
exported.)

## 3. Stripe

- Reuse the existing Stripe account (same one Lingua Mundi uses). The
  webhook already tolerates receiving the other product's events — it
  only matches its own `clerkUserId` metadata.
- Webhook endpoint (Dashboard -> Developers -> Webhooks):
  `https://<your-convex-deployment>.convex.site/stripe/webhook`
  Event: `checkout.session.completed`. Copy the signing secret to
  `STRIPE_WEBHOOK_SECRET`.
- Price: optional — the checkout uses an inline one-time $9 price, so no
  Product/Price setup is required unless you want a saved
  `STRIPE_PRO_PRICE_ID`.

## 4. Rebuild + redeploy the frontend

```bash
GH_TOKEN=... ./deploy-subtitle-toolkit.sh   # rebuilds with base path, pushes Pages, releases the ZIP
```

## 5. Verify

1. Open the app, load an .srt — free tools work with no account.
2. Click **Get Pro — $9** -> sign in (Clerk) -> **Buy** -> Stripe
   checkout -> pay (test card `4242 4242 4242 4242`).
3. Stripe webhook inserts the purchase -> the app flips to "Pro active":
   batch tools and saved presets unlock.

## Security notes

- Granting Pro is server-side only: `purchases.recordPurchase` is an
  `internalMutation` reachable solely from the Stripe webhook; no
  browser-callable mutation can create a purchase.
- The frontend's entitlement boundary is a single module
  (`src/lib/entitlements.ts`) — components read boolean flags, never
  "plan" strings.
- The Convex deployment holds user ids + purchases only — never subtitle
  or video content.
