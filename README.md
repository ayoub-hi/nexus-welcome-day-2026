# Nexus Quiz (Next.js rewrite — frontend + backend, one app)

Full rewrite of both the original Django backend and the Next.js frontend,
merged into a single Next.js app: pages and API routes live side by side, so
Auth.js's session cookie just works with no cross-origin cookie/CORS dance.
Prisma (SQLite) for storage, Auth.js (`next-auth@5` beta) for auth with
Google OAuth **and** email/password, Tailwind v4 for styling (carried over
from the original frontend).

## Event workflow

1. **People sign up/log in whenever** (`/signup` — Google or email/password),
   independent of whether the event has started.
2. **Anytime after logging in, they land on `/form`** to set their
   username/year - not gated by the event status, since this is also
   where they redeem bonus codes (see below) for points ("points from the
   get-go", credited before they've played anything).
3. **They wait for the quiz itself to open.** Only `/quizz` is gated on
   the live event status - visiting it before the event opens bounces to
   `/notstarted`, which polls `GET /api/game-state` every few seconds.
4. **An admin opens the event** from `/admin` (a `PATCH` to
   `/api/admin/game-state` flips a single DB row). No redeploy needed —
   every waiting client picks this up on its next poll (~4s) and is
   auto-routed onward, then can start the quiz.
5. **After submitting, a player only ever sees their own score**
   (`/played`, reading `GET /api/user/me`). There's no leaderboard link
   anywhere in the regular user flow.
6. **The leaderboard is admin-only**, at `/admin/leaderboard`. It loads the
   full scoreboard once, then lets the admin reveal it one row at a time —
   worst score first, winner last — for a live ceremony/announcement.

## What's different from the original apps, and why

The original setup shipped the quiz questions *and their correct answers*
to the browser in a plain JS file (`quizz.js`), scored the quiz
client-side, and then `PATCH`ed an arbitrary `points` value straight into
the user record — whose Django serializer used `fields = "__all__"`, so
nothing stopped that field (or others) from being writable. Anyone with
DevTools could read every answer, or just call the API directly with
whatever score they wanted. The frontend also had no leaderboard access
control and no live "event open/closed" mechanism (it read a build-time env
var, so flipping it meant a redeploy and a manual refresh).

This rewrite:

- **Questions are never sent with their answers.** `POST /api/quiz/start`
  returns `{ id, question, options }` only; `correctAnswer` never leaves
  the `Question` table.
- **The server owns the timer.** `startedAt`/`expiresAt` are fixed the
  moment an attempt is created. Refreshing the page can't grant more time;
  submitting after `expiresAt` (+ a small grace window for latency) scores
  zero.
- **The server owns question order**, stored per attempt
  (`QuizAttempt.questionOrder`), so grading never trusts anything the
  client claims about which question is which.
- **Grading happens server-side.** `/api/quiz/submit` is the *only* place
  `points` gets written from the quiz, derived purely from comparing
  submitted answers to the DB (it *increments* points, so it doesn't wipe
  out any bonus codes already redeemed - see below).
- **One attempt per user, enforced in the DB**, not just a `played` flag
  the client could ignore by hitting the API directly.
- **`/api/user/me` PATCH uses an explicit field allow-list** (`name`,
  `username`, `year`) instead of `fields = "__all__"` — `points`/`played`/
  `flagged`/`isAdmin` aren't writable through it.
- **The event's open/closed status lives in the database**
  (`GameState`, a single-row table), not a build-time env var — an admin
  flips it from `/admin`, and every client picks it up live via polling.
- **The leaderboard is admin-only** (`GET /api/admin/scoreboard`,
  `requireAdmin()`-gated), not reachable by regular users at all.
- **Rate limiting** on registration, quiz start/submit, code redemption,
  and status polling.
- **Auth.js instead of a hand-rolled OAuth code exchange.** The old
  frontend had a `/callback` page that manually POSTed a Google auth code
  to Django. Here, `signIn("google", ...)` and Auth.js's built-in
  `/api/auth/callback/google` route handle the whole flow — that page is
  gone, it's just not needed anymore.

## Bonus codes

A flat list of admin-defined codes, each redeemable once per user for a
fixed number of points. These aren't tied to any in-app challenge - the
challenges themselves happen wherever you're running them (Instagram, a
physical scavenger hunt, whatever platform), and all this app does is let
someone type the code they earned into `/form` and get credited.

- **Model:** `BonusCode` (`code`, `points`, an optional `label` for your
  own bookkeeping, `active`) and `CodeRedemption` (one row per user per
  code they've redeemed, unique on `[userId, bonusCodeId]` - that's what
  lets the same code be handed to many people while still being
  one-redemption-per-person).
- **Redemption lives on `/form`**, shown any time before the event ends
  (not gated on the event being live). `POST /api/codes/redeem` requires
  a normal logged-in session, increments the user's `points`, and is
  blocked once that user has started the quiz (`QuizAttempt` exists) or
  once the event has ended - both match the warning shown in the redeem
  card itself.
- **Adding codes:**
  - In bulk up front: edit `prisma/bonus-codes.json` (`code`, `points`,
    `label`), then `npm run prisma:seed` (only loads it once per table -
    edit DB rows directly or wipe the table first if you need to reseed).
  - One at a time, without touching the seed file: `npm run code:add -- <points> [label]`,
    e.g. `npm run code:add -- 20 "Instagram story challenge"` — generates
    a random, non-guessable code and prints it for you to hand out.
- **`/admin`** lists every code with its points, label, and redemption count.

## Stack

- Next.js 15 (App Router) — pages **and** API routes in one project
- Prisma + SQLite
- Auth.js (`next-auth@5` beta) — Google OAuth **and** email/password
  (Credentials provider), JWT sessions
- Tailwind v4, `lucide-react` icons (same as the original frontend)
- Zod for request validation, bcryptjs for password hashing

## Project layout

```
prisma/
  schema.prisma       # User (+ Auth.js tables), GameState, Question, QuizAttempt, BonusCode, CodeRedemption
  questions.json        # the original 40 questions, extracted from the old frontend
  bonus-codes.json       # placeholder bonus codes (edit before the event, or use npm run code:add)
  seed.js               # loads both of the above into the DB (idempotent)
scripts/
  set-admin.js           # CLI: grant/revoke isAdmin on a user by email
  add-code.js             # CLI: create a new bonus code on the fly
src/
  lib/
    prisma.js           # Prisma client singleton
    auth.js              # Auth.js config: Google + Credentials, JWT session
    api-utils.js         # requireUser()/requireAdmin(), CORS helper, rate limiter
    api-client.js         # fetch() wrapper for client components (replaces axios.js)
    game-state.js          # get/setGameStatus() - the singleton GameState row
    use-game-status.js      # client hook: polls GET /api/game-state every ~4s
  app/
    layout.jsx            # root layout, wraps everything in <Providers> (SessionProvider)
    page.jsx               # welcome page
    signup/page.jsx         # Google button (signIn) + email/password register/login
    played/page.jsx          # shows the server-computed score (GET /api/user/me) - final page for players
    ended/, notstarted/     # live game-status pages, poll and auto-advance
    (protected)/
      layout.jsx            # useSession() gate + already-played redirect (NOT game-status gated)
      form/page.jsx           # username + year, PATCH /api/user/me, + bonus code redemption card
      quizz/page.jsx           # game-status gated here; fetches questions (no answers), server grades
    admin/
      layout.jsx             # isAdmin gate (UI-level only - APIs re-check server-side)
      page.jsx                # dashboard: live event status + bonus code list/stats
      leaderboard/page.jsx     # one-at-a-time reveal tool, worst -> best
    api/
      auth/[...nextauth]/route.js   # Auth.js handler
      auth/register/route.js         # email/password sign-up
      quiz/start/route.js            # creates/resumes an attempt, returns questions w/o answers
      quiz/submit/route.js           # grades server-side, INCREMENTS points (preserves bonus points)
      game-state/route.js            # public GET - polled by waiting clients
      user/me/route.js               # GET profile / PATCH allow-listed fields
      codes/
        redeem/route.js               # authed POST - redeems a bonus code, increments points
      admin/
        game-state/route.js           # admin-only GET/PATCH - flips the live status
        scoreboard/route.js            # admin-only GET - full scoreboard for the reveal tool
        bonus-codes/route.js            # admin-only GET - all codes with redemption counts
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | `file:./dev.db` for local dev |
| `AUTH_SECRET` | `npx auth secret` or `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | From the Google Cloud Console. Redirect URI: `<your-domain>/api/auth/callback/google` |
| `QUIZ_DURATION_SECONDS` | Defaults to 213 (3:33), matching the original |
| `QUIZ_POINTS_PER_CORRECT_ANSWER` | Defaults to 10 |
| `ALLOWED_ORIGINS` | Only matters if something ever calls this API cross-origin; frontend+backend are same-origin now |

The event's open/closed status is **not** an env var anymore — see below.

## Running locally (without Docker)

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates dev.db and applies the schema
npm run prisma:seed                   # loads the 40 questions + placeholder bonus codes
npm run dev                           # http://localhost:3000
```

> Note: `prisma generate`/`migrate` download a native query engine binary
> the first time. If you're behind a restrictive firewall/proxy, make sure
> it can reach `binaries.prisma.sh`.

## Running with Docker

```bash
cp .env.example .env   # fill in AUTH_SECRET and Google OAuth creds
docker compose up -d --build
```

The entrypoint runs `prisma migrate deploy`, seeds the questions/bonus
codes if those tables are empty, then starts the server on port 3000. The
SQLite file is kept in a named Docker volume (`quiz-db`) so it survives
rebuilds.

## Granting admin access

There's no sign-up path to becoming an admin - grant it manually once
someone has an account:

```bash
npm run admin:set -- someone@example.com          # grant
npm run admin:set -- someone@example.com --revoke  # revoke
```

(In Docker: `docker compose exec nexus-quiz-backend npm run admin:set -- someone@example.com`.)

They'll need to have signed up first (the script looks up the account by
email). Once granted, `/admin` is reachable from their session.

## Controlling the event live

1. An admin visits `/admin` and clicks **Open** to start the quiz for
   everyone currently waiting on `/notstarted` — they'll be routed to
   `/form` automatically within a few seconds, no action needed on their
   end.
2. Click **Ended** when the event is over; anyone still on the quiz/form
   pages gets redirected to `/ended`. (In-progress attempts already have
   their own server-side deadline via `QuizAttempt.expiresAt`, independent
   of this switch — this only gates *new* access to `/form`/`/quizz`, and
   closes the bonus-code redemption window too.)
3. Go to `/admin/leaderboard` to run the reveal for an announcement/ceremony.
   It snapshots the current scoreboard on load; use the page's own refresh
   (reload the page) if you want a newer snapshot, and note that
   re-loading resets the reveal progress.

## User flow

1. `/` → `/signup` — sign up with Google, or email/password (both create a
   Prisma-backed `User`)
2. `/form` — reachable immediately, any time after login. Set username +
   year (`PATCH /api/user/me`) and redeem any bonus codes
   (`POST /api/codes/redeem`) for points, before the quiz even opens
3. `/quizz` — this is where the live event-status gate actually applies;
   bounces to `/notstarted` if the event hasn't opened yet. Once open,
   `POST /api/quiz/start` fetches the (answer-free) question set and
   starts the server-side timer; each pick is stored locally until the
   last question or the timer hits zero, then one `POST /api/quiz/submit`
   grades everything server-side and adds to (not overwrites) their points
4. `/played` — shows the real score, read fresh from the DB. This is the
   end of the line for a regular user - no leaderboard access.

## API reference

All responses are JSON. Endpoints under `/api/quiz/*`, `/api/user/me`,
`/api/codes/*`, and everything under `/api/admin/*` require an
authenticated session (the cookie Auth.js sets on sign-in); `/api/admin/*`
additionally requires `isAdmin`, checked server-side on every request
regardless of what the client's session claims.

### `POST /api/auth/register`
```json
{ "email": "a@b.com", "password": "min-8-chars" }
```
`username`/`name`/`year` are optional here — they're normally set via the
`/form` page after sign-in (`PATCH /api/user/me`), the same step Google
sign-ups go through.

### Auth.js routes (`/api/auth/*`)
Standard Auth.js routes: `/api/auth/signin`, `/api/auth/signout`,
`/api/auth/session`, `/api/auth/callback/google`, etc. — used internally by
`signIn()`/`signOut()`/`useSession()` from `next-auth/react`.

### `GET /api/game-state`
Public, rate-limited generously (it's polled). `{ "status": "not_started" | "open" | "ended" }`.

### `GET/PATCH /api/admin/game-state`
Admin-only. `PATCH` body: `{ "status": "not_started" | "open" | "ended" }`.

### `POST /api/quiz/start`
No body. Requires auth. Creates the user's one and only attempt (or resumes
an unfinished one with its original deadline). Returns:
```json
{ "attemptId": "...", "startedAt": "...", "expiresAt": "...",
  "questions": [{ "id": 7, "question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."} }] }
```
Fails with 403 if the user already played or is flagged, 500 if no
questions are seeded yet.

### `POST /api/quiz/submit`
```json
{ "answers": { "7": "A", "12": "D" } }
```
Grades server-side against the attempt's stored question order. Returns
correct count and points awarded; late submissions score 0. Increments
`points` (doesn't overwrite) so any bonus-code points survive, and sets `played`.

### `POST /api/codes/redeem`
Requires auth. `{ "code": "NX-9FP292VA" }`. Looks up the code, increments
the caller's `points`, and records the redemption against that user (404
if the code doesn't exist/isn't active, 409 if *this user* already
redeemed it, 403 once the user has started the quiz or the event has
ended).

### `GET /api/admin/scoreboard`
Admin-only. `{ "players": [{ "id", "username", "name", "points", "year" }, ...] }`,
sorted by points, only includes users who've played.

### `GET /api/admin/bonus-codes`
Admin-only. `{ "codes": [{ "code", "label", "points", "active", "redeemed" }, ...] }`.

### `GET/PATCH /api/user/me`
`GET` returns the caller's safe profile. `PATCH` accepts only `{ name?,
username?, year? }` — anything else is rejected with 422.

## Known non-issues

`npm audit` flags a couple of `postcss` advisories pulled in transitively by
Next's build tooling (XSS in CSS stringify output, source-map path
traversal). Both are build-time-only and only exploitable if the build
process is fed attacker-controlled CSS/source maps, which nothing here
does. Fixing them means jumping to Next 16, which isn't validated against
`next-auth@5` beta yet — worth revisiting once that combination is stable.
