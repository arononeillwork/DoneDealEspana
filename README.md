# DoneDealEspana

A marketplace for buying and selling anything in Spain. Members create an account, list items with photos, chat with buyers and track their listings and sales.

- **Free to list.** Sellers pay a **fixed €5 sale fee** through Stripe Checkout when they mark an item as sold. The item then shows as sold and is added to the seller's *items sold* count.
- **Every transaction is between buyer and seller.** DoneDealEspana does not take part in sales or handle item payments (see `#/terms`).

## How it's built

| Part | Where |
| --- | --- |
| Website (static, no build step) | `index.html`, `assets/`, `js/`, hosted on Vercel |
| Database, logins, photo storage, realtime chat | Supabase (`supabase/migrations/`) |
| €5 sale fee, payment confirmation, Stripe webhook, account deletion | Supabase Edge Function `supabase/functions/marketplace` |

The browser uses the public Supabase anon key in `js/config.js`. Every table is protected by row level security; the protected columns (seller, items sold, views, sold status) can only be changed server-side.

### Pages

Home & search, item page, sell / edit form, **My items** (for sale, sold, purchases, sale fees, with views, saves and chats per item), messages (realtime), saved items, public seller profile (items sold), account settings, login / sign-up / password reset, Terms, Privacy, How it works.

## Configuration

`js/config.js`: Supabase URL and anon key, the fee shown on the site (`SALE_FEE_EUR`), and the operator details shown in the Terms (`LEGAL`). Spanish law (LSSI-CE) expects the operator's name, NIF/CIF, address and contact email to be published.

Edge Function secrets (Supabase dashboard → Edge Functions → Secrets):

| Secret | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Required to take the sale fee |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the Stripe webhook below (recommended) |
| `STRIPE_PRICE_ID` | Optional: use an existing Stripe Price instead of an inline €5 line item |
| `SALE_FEE_CENTS` | Optional, default `500` |
| `SITE_URL` | Optional fallback for Stripe return links |

Stripe webhook endpoint: `https://<project-ref>.supabase.co/functions/v1/marketplace`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`. Without the webhook, the payment is still confirmed when the seller returns from Checkout.

Supabase Auth → URL Configuration: set **Site URL** to the live site and add it to **Redirect URLs**, so confirmation and password-reset emails link back to the site.

## Local preview

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.
