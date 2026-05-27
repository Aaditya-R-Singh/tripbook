# TripBook 🚛

Logistics management app for small truck business owners. Track trips, manage trucks, monitor e-passes, and handle payments — all from your phone or desktop. Drivers can also report trips via WhatsApp.

## Features

- **Dashboard** — Daily overview of trips, active trucks, pending payments, and e-pass expiry alerts
- **Trips** — Add, view, and manage truck trips with driver details, route, and payment status
- **Trucks** — Register trucks, track e-pass numbers and expiry dates
- **E-Pass** — Monitor expiring e-passes and send WhatsApp reminders to owners
- **Payments** — Monthly payment summaries, mark as paid, overdue alerts, PDF export
- **WhatsApp Integration** — Drivers can start trips, mark complete, and get reports by sending messages

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (phone + password)
- **Font**: Inter (next/font)
- **Icons**: Lucide React

## Setup Instructions

### Prerequisites

- Node.js 20+
- A Supabase account (free tier works)
- A Meta for Developers account (for WhatsApp)

### 1. Clone and install

```bash
git clone https://github.com/your-username/tripbook.git
cd tripbook
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the SQL from `sql/setup.sql` to create tables and RLS policies
3. Go to **Project Settings > API** and copy your URL, anon key, and service_role key

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings > API > anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings > API > service_role key (admin access) |
| `WHATSAPP_TOKEN` | Meta for Developers > WhatsApp > API Setup > Permanent Access Token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta for Developers > WhatsApp > API Setup > Phone Number ID |
| `WHATSAPP_VERIFY_TOKEN` | Any string you choose (used for webhook verification) |
| `CRON_SECRET` | Any string you choose (secures cron endpoints) |

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Set up WhatsApp webhook

After deploying to Vercel (or using ngrok for local testing):

1. Go to your Meta app dashboard → **WhatsApp** → **Configuration**
2. Set **Callback URL** to: `https://your-domain.com/api/webhook`
3. Set **Verify Token** to the same value as `WHATSAPP_VERIFY_TOKEN` in your env
4. Click **Verify and Save**
5. Subscribe to the **messages** webhook field

The webhook endpoint handles these commands from drivers:
- `START` or `SHURU` — Register as a new user
- `MH31AB1234, Mumbai` — Start a trip (truck number + location)
- `PAHUNCHA` or `REACHED` or `DONE` — Mark current trip as complete
- `HISAAB` or `REPORT` — Get today's trip summary

### 6. Set up e-pass reminders (cron job)

In Vercel, create a cron job that calls the API endpoint daily:

- **URL**: `https://your-domain.com/api/send-epass-reminder`
- **Method**: POST
- **Body**: `{ "truckIds": ["id1", "id2", ...] }` (get expiring truck IDs from your database)

Alternatively, set up a Supabase scheduled function or any external cron service.

## Deploy on Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the GitHub repo
3. Add all environment variables from `.env.example` in the Vercel project settings
4. Deploy — Vercel auto-detects Next.js

### WhatsApp Webhook URL After Deployment

Once deployed, your webhook URL will be:
```
https://your-project.vercel.app/api/webhook
```

Enter this in Meta for Developers → WhatsApp → Configuration → Callback URL.

## Project Structure

```
app/
├── api/
│   ├── webhook/          # WhatsApp incoming message handler
│   └── send-epass-reminder/  # Cron endpoint for e-pass alerts
├── dashboard/
│   ├── page.tsx          # Home dashboard
│   ├── trips/            # Trip management
│   ├── trucks/           # Truck management
│   ├── epass/            # E-pass monitoring
│   ├── payments/         # Payment tracking
│   └── settings/         # Settings
├── actions/              # Server actions (onboarding)
└── globals.css           # Global styles + design system
components/
├── ui/                   # shadcn-style UI components
└── ErrorBoundary.tsx
lib/
├── supabase.ts           # Supabase browser client
├── whatsapp.ts           # WhatsApp API helper
├── types.ts              # Shared TypeScript types
└── utils.ts              # cn() helper
sql/
└── setup.sql             # Database schema + RLS policies
```
