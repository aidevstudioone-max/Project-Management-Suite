# Connecting ठिkaana Ops to Supabase (shared team database)

`thikaana-ops.html` normally keeps all its data in the browser's `localStorage`, so
every person sees their own private copy. This wires it to a single Supabase table so
the **4 team members share one live dataset** — tickets, clients, meetings, vault,
expenses, the audit log and website content all sync between everyone.

The login stays the same shared account: **support@thikaana.co / Findmenow@123**.
Each browser still keeps its *own* session (logging out on one device does not log
out the others) — only the *data* is shared.

---

## 1. Create the project

1. Go to <https://supabase.com/dashboard> (you're already signed in with GitHub).
2. **New project** → give it a name (e.g. `thikaana-ops`), pick a region close to
   India (e.g. *Mumbai / ap-south-1*), set a database password (you won't need it
   for this), **Create new project**. Wait ~2 minutes for it to provision.

## 2. Create the table

Open **SQL Editor** (left sidebar) → **New query**, paste this, click **Run**:

```sql
-- One row per data bucket (clients, tickets, meetings, vault, ...).
create table public.thikops_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security is ON, with an open policy for the anon (public) key.
-- The data here is demo/operational content for a 4-person team, and the
-- anon key is meant to be publishable — this matches that posture.
alter table public.thikops_state enable row level security;

create policy "anon full access to thikops_state"
  on public.thikops_state
  for all
  to anon
  using (true)
  with check (true);
```

## 3. Turn on Realtime (optional but nice — instant sync instead of ~20s)

**Database → Replication** (or **Realtime**) → enable replication for the
`public.thikops_state` table. If you skip this, the app still syncs every 20
seconds and whenever a tab regains focus.

## 4. Get the two values

**Project Settings → API**:

- **Project URL** — looks like `https://abcdefghijklmno.supabase.co`
- **Project API keys → `anon` `public`** — a long string starting with `eyJ...`

## 5. Paste them into the HTML

In `thikaana-ops.html`, near the top of the first `<script>` block, find the
**SUPABASE** config section and fill in the two empty strings:

```js
const SUPABASE_URL = "https://abcdefghijklmno.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...your-anon-key...";
```

Leave `SUPABASE_TABLE` as `"thikops_state"`.

## 6. Commit & deploy

```bash
git add thikaana-ops.html SUPABASE_SETUP.md
git commit -m "Wire Thikaana Ops to shared Supabase database"
git push
```

GitHub Pages redeploys `main` automatically. Open
<https://aidevstudioone-max.github.io/Project-Management-Suite/Thikaana_ops>,
sign in, and open the browser console — you should see
`[cloud] connected — shared Thikaana team workspace is live`. The top banner
switches to **SHARED TEAM WORKSPACE**.

---

## How it behaves

| Situation | What happens |
|---|---|
| Config left blank | App runs exactly as before, on this browser's `localStorage`. |
| Config filled, Supabase reachable | On load it pulls all data from Supabase into memory; every change is written back and pushed to the other members. |
| Supabase temporarily unreachable | Falls back to the last data cached in `localStorage`; changes queue only locally until the next successful save. |
| **Settings → Reset Data** | With the DB connected this clears the shared data **for everyone** and re-seeds the demo dataset. The confirm dialog warns about this. |

## First-run seeding

The first team member to open the connected app seeds the demo dataset (clients,
tickets, etc.) and uploads it. Everyone after that just loads it. If two people
open it for the very first time at the same instant they may both seed — the rows
converge to the same content on the next save, so it's harmless.

## Data model

Everything lives in one table as `key` → `value` (JSON):

| key | contents |
|---|---|
| `clients`, `clientUsers`, `tickets`, `meetings`, `vault`, `expenses`, `audit`, `employees`, `customRoles` | the core arrays |
| `websiteContent` | per-client published/draft website copy |
| `seedVersion`, `wcSeedVersion` | seed markers so the demo data isn't re-seeded on every load |

Not synced (deliberately): `thikops_session` (per-device login) and `thikops_wmDark`
(per-device dark-mode preference).

## If you ever want to inspect or fix data

Supabase dashboard → **Table Editor → thikops_state**. Each row's `value` is
editable JSON. Editing it there propagates to the team within 20s (or instantly
with Realtime on).

---

# Footfall — website visitor analytics for thikaana.co

The **Footfall** section (under ठिkaana Workspace) shows live visitor stats for
`https://www.thikaana.co/`. It uses its own table, separate from the shared state.

## 1. Create the footfall table

**SQL Editor → New query → Run:**

```sql
create table public.thikops_footfall (
  id         bigint generated always as identity primary key,
  site       text not null default 'thikaana.co',
  path       text,
  referrer   text,
  visitor_id text,
  session_id text,
  user_agent text,
  ts         timestamptz not null default now()
);
create index thikops_footfall_ts_idx on public.thikops_footfall (ts desc);

alter table public.thikops_footfall enable row level security;

-- Anyone can record a page view (INSERT only) ...
create policy "anon insert footfall" on public.thikops_footfall
  for insert to anon with check (true);
-- ... and the Ops app (anon key) can read the stats.
create policy "anon read footfall" on public.thikops_footfall
  for select to anon using (true);
```

> Open anon INSERT means anyone who finds the key could push fake rows. For a small
> business marketing site that's an acceptable trade-off; if it's ever abused,
> rotate the anon key or add a stricter policy.

## 2. Add the tracker to thikaana.co

Put this in the `<head>` of every page on `thikaana.co` (or in the site's shared
template / footer include):

```html
<script src="https://aidevstudioone-max.github.io/Project-Management-Suite/track.js" data-site="thikaana.co"></script>
```

`track.js` lives in this repo and is served by GitHub Pages. It writes one row per
page view: path, referrer, a per-browser `visitor_id` (localStorage) and a
per-tab `session_id` (sessionStorage). No cookies, no personal data.

## 3. Watch it in the app

Open **Footfall** in ठिkaana Ops. It shows page views, unique visitors, sessions,
a per-day chart, top pages, top referrers and a live "recent visits" feed. It
auto-refreshes every 30 seconds while the tab is open. Ranges: 7 / 30 / 90 days.

Until the snippet is live on thikaana.co the section just says "no visits recorded
yet" — that's expected, not an error.

## Inspecting / clearing footfall data

Table Editor → **thikops_footfall**. To wipe it: `delete from public.thikops_footfall;`
in the SQL Editor.
