# VAULTA

Static marketing/app pages (`public/`) served by Next.js, with a MongoDB-backed API (`src/app/api`).

## Run locally

```bash
npm install
cp .env.example .env.local      # then fill in MONGODB_URI and AUTH_SECRET
npm run dev
```

No Atlas account yet? `npm run dev:db` starts a throwaway local MongoDB (first run downloads a `mongod` binary) and prints the URI to use.

## API

| Route | |
|---|---|
| `POST /api/auth/signup`, `login`, `logout`; `GET /api/auth/me` | Email + password, bcrypt, HttpOnly JWT cookie |
| `GET /api/investments`, `/api/investments/:id` | Catalog (`src/lib/catalog.ts`) |
| `GET /api/portfolio` | Balance, totals, allocation, recent orders |
| `POST /api/orders` | Place an investment order (atomic balance debit) |
| `POST /api/funds` | Demo top-up (disable with `ALLOW_DEMO_FUNDING=false`) |
| `GET/PUT /api/retirement`, `POST /api/retirement/contributions` | 401(k) plan, projection, contributions with annual-limit check |
| `POST /api/contact`, `POST /api/newsletter` | Stored in MongoDB |

Money is stored as integer cents. Collections: `users`, `orders`, `retirement_plans`, `retirement_contributions`, `contact_messages`, `newsletter`, `auth_attempts` (rate limiting, TTL). Indexes are created on first request.

## Deploy to Vercel

1. Create a MongoDB Atlas cluster. Under **Network Access** allow `0.0.0.0/0` (Vercel has no fixed IPs), or use the Vercel–Atlas integration from the Vercel Marketplace.
2. Push this folder to a Git repo and import it in Vercel (framework: Next.js, no build settings to change).
3. Add environment variables: `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET` (32+ random chars), `DEMO_STARTING_BALANCE`, `ALLOW_DEMO_FUNDING`.
4. Deploy.

## Things to know

- This is a demo platform: balances are fake, and investment values are simulated from each product's demo annual return.
- `ANNUAL_401K_LIMIT_CENTS` in `src/lib/retirement.ts` is a yearly IRS figure. Verify and update it each January.
- Replace the placeholder legal pages before collecting real user data.

