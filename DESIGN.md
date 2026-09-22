# Design notes

A personal site is a small system, so the interesting part is not what it does but
what it gives up. This file records the decisions that were not obvious at the time
and what each of them costs. Setup and commands live in the [README](README.md).

## Shape

```
browser ──▶ Vercel edge (ISR cache) ──▶ Nitro handler ──▶ Neon Postgres (HTTP)
                    ▲                         │
                    │                         ├── /api/admin/**    cookie session
              revalidate                      ├── /api/publish/**  bearer token
              (queue + Flush)                 └── /api/**          public, cached
```

Content is edited in an admin panel at `/admin` and also arrives from an external
publisher over `/api/publish/posts`. Everything the public sees is rendered from
Postgres and cached by the edge.

Constraints behind the decisions: one maintainer, free tiers, a serverless runtime
with no shared memory between invocations, and a database driven over HTTP.

---

## 1. ISR with an explicit invalidation queue, not SSR everywhere

Public pages are served from the edge cache with per-route windows: blog and
projects 10 minutes, resume and contacts 2 hours, static pages a day. Writes do
not revalidate inline — they append the affected paths to a `pending_revalidation`
table, and the dashboard shows the queue with a **Flush** button.

**Why.** A page render is 3–6 Neon round trips over HTTP; at the traffic this site
gets, serving the same render a thousand times is free and rendering it a thousand
times is not. Revalidating inline was also wrong in practice: one edit to a
skill group touches `/ru/resume`, `/en/resume`, `/ru/cv`, `/en/cv`, and doing four
edge round trips inside a PATCH makes the admin panel feel broken.

**Why a queue rather than fire-and-forget.** On Vercel an ISR page lives at the
edge, not in Nitro storage, so the only way to refresh it from inside the app is to
re-request it with an `x-prerender-revalidate` token. That call can fail. A queue
makes the failure visible — the dashboard reports which paths failed and why —
instead of a button that always claims success while the site stays stale.

**Cost.** Content is stale until the window expires or someone presses Flush. This
is acceptable because the only writer is the site owner, who is looking at the
dashboard anyway. On a multi-author site it would not be.

## 2. Rate limiting in Postgres, not in memory

`hitRateLimit(key, limit, windowMs)` is a single `insert … on conflict do update`
that creates the window, increments it, and rolls it over when expired.

**Why.** Serverless invocations do not share memory. An in-process counter limits
one lambda instance, which means five login attempts per instance, which means no
limit at all. The database is the only state every invocation already shares, and
adding Redis for one counter is more moving parts than the problem deserves.

**Why one statement.** Read-then-write races under concurrency, which is the exact
situation a limiter exists for.

**Cost.** Every rate-limited request pays a database write: login (5 per 15 min),
the contact form (3 per hour), the publisher (60 per hour). All of them are low
volume by definition. A read-heavy endpoint would not be limited this way.

**Client address.** `x-forwarded-for` is deliberately ignored — a client can send
it, and spoofing it would reset any counter. The chain is
`x-vercel-forwarded-for` → `x-real-ip` → socket address, all of which are set by
infrastructure rather than by the caller.

## 3. Neon over HTTP means no transactions, so nothing depends on them

The HTTP driver has no multi-statement transactions. Rather than switch to the
WebSocket driver for them, operations are designed so that a partial result is a
valid state.

**Why.** The WebSocket driver holds a connection, and holding connections from a
function that may be frozen mid-request is a worse problem than the one it solves.

**How it shows up.** Importing a CV applies each accepted change independently, so
a failure halfway leaves the earlier changes in place and the diff simply shows the
rest on the next run. Publishing a post writes the post, then rewrites its tag
links; the recomputed link set is derived only from the incoming payload, so
re-running the same publish converges to the same rows.

**Cost.** No atomic multi-row writes. Any future operation that genuinely needs
all-or-nothing would need the WebSocket driver or a redesign.

## 4. One password, a JWT cookie, and no user table

There is one admin. The password is a bcrypt hash in an environment variable, and a
successful login sets a signed `wms_admin` cookie (`httpOnly`, `sameSite=lax`,
7 days, slid forward when less than half the life remains).

**Why no user table.** Users, roles, resets and sessions are a schema and a set of
flows that exist to serve more than one person. Here they would exist to serve one.

**Why `lax`, not `strict`.** With `strict`, following a link to `/admin` from
anywhere else showed the login form despite a live session. `lax` still withholds
the cookie on cross-site POST/PATCH/DELETE, so CSRF protection is unchanged; only
plain navigation differs.

**Cost.** Rotating `ADMIN_JWT_SECRET` invalidates the session immediately, which is
the intended revocation mechanism but also the only one — there is no session list
and no per-device logout.

## 5. The publisher API is idempotent by `external_id`

`POST /api/publish/posts` is authenticated with a bearer token and keyed on
`external_id` supplied by the caller. A repeat publish with the same id updates the
existing post. A post that already has a different `external_id` and the same slug
returns 409 rather than being overwritten; a slug that belongs to a post with no
`external_id` is adopted.

**Why.** The caller is an automation that retries. Without a stable key, a retry
creates a duplicate post; with a slug as the key, two independent systems silently
overwrite each other.

**Why HTML is stored, not rendered per request.** Markdown is converted and
sanitized once on write. Rendering per request would put a markdown parser in the
hot path of every cached page rebuild, and sanitizing once means the stored value is
the reviewed one.

**Cost.** Changing the renderer requires republishing existing posts.

## 6. Bilingual content: parallel columns with fallback, not a translations table

Every translatable row carries `*_ru` and `*_en` columns. `pick()` returns the
English value when it is non-empty and the Russian one otherwise; any locale that is
not `en` reads as `ru`.

**Why not a `translations` table.** Two locales, both known at schema time, both
needed in the same query. A join table would turn every read into a join and every
write into a fan-out to buy flexibility for languages that do not exist.

**Why fallback instead of required fields.** The publisher only sends Russian, and
requiring English would mean either blocking publication or storing machine
translation. Falling back means the English site is always complete, just partly in
Russian.

**Cost.** The gap is silent — nothing breaks, so nothing reports it. That is why
`/api/admin/stats` counts empty English fields per section and the dashboard shows
them with links to where each is edited. The counter exists because the fallback
hides the problem by design.

## 7. Tests drive real handlers over a fake database, not a container

`tests/nuxt/flows` runs whole scenarios — admin login and session sliding, CV
export → diff → apply, publish → republish → update — through the real handlers,
middleware, `jose` and `bcrypt`, with only `~~/server/db` replaced by a stub that
answers per operation and table and records every call.

**Why not a real Postgres in Docker.** The suite has to run on `pre-push` on one
laptop. A container raises the cost of running tests, and the thing most likely to
break here is handler logic — status codes, idempotency, ordering — not SQL dialect.

**Why keyed by operation and table, not by call order.** Handlers await
conditionally, so a positional queue of responses breaks whenever a branch changes,
and the test fails for a reason unrelated to the behaviour it describes.

**Cost, stated plainly.** The HTTP layer is not covered: routing, real cookie
parsing, and actual SQL are assumed correct. Closing that gap needs a Neon test
branch or `NEON_LOCAL_SQL_ENDPOINT` against a local Postgres, both documented in the
README. Coverage is ~90% of statements over composables, stores, middleware and
server utils.

---

## Known gaps

- **Observability is error-only.** Sentry reports exceptions on both sides, but
  there are no metrics: a route that gets slow, or a publish that succeeds while
  writing the wrong thing, produces no signal at all.
- **No degradation story.** If Neon is unavailable, cached pages keep serving until
  their window expires and then fail. There is no stale-while-error path.
- **Single region.** Functions and database are both in one region; latency for
  readers far from it is what it is.
- **Blob images are outside the backup.** A database dump restores content but not
  the images in Vercel Blob; they are re-uploadable, not recoverable.
