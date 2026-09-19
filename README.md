# Nexus Quiz (Next.js rewrite — frontend + backend, one app)

Full rewrite of both the original Django backend and the Next.js frontend,
merged into a single Next.js app: pages and API routes live side by side, so
Auth.js's session cookie just works with no cross-origin cookie/CORS dance.
Prisma (SQLite) for storage, Auth.js (`next-auth@5` beta) for auth with
Google OAuth **and** email/password, Tailwind v4 for styling (carried over
from the original frontend).

## Event workflow

0. **Pre-event: OSINT warm-up.** A QR code (put it wherever you like -
   posters, social posts) points at the unlisted page `/guvoruc3k4` (not
   linked from anywhere else in the app - see "Pre-event OSINT warm-up"
   below for why), which needs **no login**.
   It serves 3 challenges one at a time - solving one unlocks the next and
   mints a single-use code (tracked against an anonymous, cookie-carried
   session, not an account, since there isn't one yet). Codes are shown on
   the page the whole time so people can screenshot/save them.
1. **People sign up/log in whenever** (`/signup` — Google or email/password),
   independent of whether the event has started.
2. **Anytime after logging in, they land on `/form`** to set their
   username/year - not gated by the event status, since this is also
   where they redeem any OSINT codes from step 0 for bonus points
   ("points from the get-go", credited before they've played anything).
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
  `points` gets written, derived purely from comparing submitted answers to
  the DB.
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
- **Rate limiting** on registration, quiz start/submit, and status polling.
- **Auth.js instead of a hand-rolled OAuth code exchange.** The old
  frontend had a `/callback` page that manually POSTed a Google auth code
  to Django. Here, `signIn("google", ...)` and Auth.js's built-in
  `/api/auth/callback/google` route handle the whole flow — that page is
  gone, it's just not needed anymore.

## Pre-event OSINT warm-up

`/guvoruc3k4` is a public page (no auth) meant to sit behind a QR code. It's
deliberately not a memorable word like `/osint` and isn't linked from
anywhere else in the app - the idea is you have to go through the QR code
(or someone who has the URL) to find it. **This is obscurity, not a real
access control**: once someone loads the page once, its two API routes
(`/api/osint/challenge`, `/api/osint/submit`) are visible in their
browser's network tab like any other public API, regardless of what the
page URL is. If you ever need this to be a hard boundary rather than "stop
people from stumbling onto it," that needs a different mechanism (e.g. a
token embedded in the QR code itself that the API also checks).

It's backed by three tables: `OsintChallenge` (the content, including a
**single fixed code per challenge** - the same code for every solver, not
minted per person), `OsintSession` (an anonymous, cookie-carried identity
for someone who hasn't signed up yet), `OsintSolve` (records that a given
anonymous session solved a given challenge, for sequential unlocking), and
`OsintRedemption` (records that a given *user* has redeemed a given
challenge's code - scoped per user since the code itself is shared).

- **Anonymous progress tracking.** First visit sets an `httpOnly` cookie
  holding a random session id (`lib/osint-session.js`). Solve progress is
  tied to that id, not to any account - there isn't one yet.
- **Sequential unlock is enforced server-side**, not just hidden in the UI:
  `POST /api/osint/submit` only accepts an answer for the one challenge
  the session hasn't already solved, in order.
- **Codes are static and shared.** Every solver of challenge 2 gets the
  exact same code back - it's a fixed value from
  `prisma/osint-challenges.json`, not generated per person. Because of
  that, "already redeemed" is tracked per *user* (`OsintRedemption`,
  unique on `[userId, challengeId]`), not per code - many different
  people can each redeem the same code once, but nobody can redeem a
  given challenge twice.
- **Redemption lives on `/form`.** `POST /api/osint/redeem` requires a
  normal logged-in session and increments the user's `points` -
  importantly, `/api/quiz/submit` was changed to *increment* `points`
  too (it used to overwrite), so OSINT bonus points earned before the
  quiz survive playing it.
- **Editing the challenges:** replace the placeholder content in
  `prisma/osint-challenges.json` (`description`, `answers` - an array of
  acceptable answers, matched case-insensitively - `code`, and `points`),
  then re-run the seed (`npm run prisma:seed` only loads it once per
  table, so either edit the DB rows directly afterwards or wipe the table
  first).
- **`/admin`** shows solved/redeemed counts per challenge, and each
  challenge's code for reference.

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
  schema.prisma       # User (+ Auth.js tables), GameState, Question, QuizAttempt, Osint*
  questions.json        # the original 40 questions, extracted from the old frontend
  osint-challenges.json  # the 3 pre-event OSINT challenges (placeholder content - edit before the event)
  seed.js               # loads both of the above into the DB (idempotent)
scripts/
  set-admin.js           # CLI: grant/revoke isAdmin on a user by email
src/
  lib/
    prisma.js           # Prisma client singleton
    auth.js              # Auth.js config: Google + Credentials, JWT session
    api-utils.js         # requireUser()/requireAdmin(), CORS helper, rate limiter
    api-client.js         # fetch() wrapper for client components (replaces axios.js)
    game-state.js          # get/setGameStatus() - the singleton GameState row
    use-game-status.js      # client hook: polls GET /api/game-state every ~4s
    osint-session.js        # anonymous, cookie-carried session for pre-login OSINT progress
    osint.js                 # answer normalization/matching for OSINT challenges
    codes.js                  # random redeemable code generator
  app/
    layout.jsx            # root layout, wraps everything in <Providers> (SessionProvider)
    page.jsx               # welcome page
    signup/page.jsx         # Google button (signIn) + email/password register/login
    osint/page.jsx           # (folder is actually named after the random slug, e.g. guvoruc3k4) public QR-landing page
    played/page.jsx          # shows the server-computed score (GET /api/user/me) - final page for players
    ended/, notstarted/     # live game-status pages, poll and auto-advance
    (protected)/
      layout.jsx            # useSession() gate + already-played redirect (NOT game-status gated)
      form/page.jsx           # username + year, PATCH /api/user/me, + OSINT code redemption card
      quizz/page.jsx           # game-status gated here; fetches questions (no answers), server grades
    admin/
      layout.jsx             # isAdmin gate (UI-level only - APIs re-check server-side)
      page.jsx                # dashboard: live event status + OSINT issued/redeemed stats
      leaderboard/page.jsx     # one-at-a-time reveal tool, worst -> best
    api/
      auth/[...nextauth]/route.js   # Auth.js handler
      auth/register/route.js         # email/password sign-up
      quiz/start/route.js            # creates/resumes an attempt, returns questions w/o answers
      quiz/submit/route.js           # grades server-side, INCREMENTS points (preserves OSINT bonus)
      game-state/route.js            # public GET - polled by waiting clients
      user/me/route.js               # GET profile / PATCH allow-listed fields
      osint/
        challenge/route.js            # public GET - current unlocked challenge + earned codes
        submit/route.js                # public POST - checks answer, mints a code on success
        redeem/route.js                 # authed POST - redeems a code, increments points
      admin/
        game-state/route.js           # admin-only GET/PATCH - flips the live status
        scoreboard/route.js            # admin-only GET - full scoreboard for the reveal tool
        osint-stats/route.js            # admin-only GET - solved/redeemed counts per challenge
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
npm run prisma:seed                   # loads the 40 questions
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

The entrypoint runs `prisma migrate deploy`, seeds the questions if the
table is empty, then starts the server on port 3000. The SQLite file is
kept in a named Docker volume (`quiz-db`) so it survives rebuilds.

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
   of this switch — this only gates *new* access to `/form`/`/quizz`.)
3. Go to `/admin/leaderboard` to run the reveal for an announcement/ceremony.
   It snapshots the current scoreboard on load; use the page's own refresh
   (reload the page) if you want a newer snapshot, and note that
   re-loading resets the reveal progress.

## User flow

1. `/guvoruc3k4` (optional, pre-event, unlisted URL - see "Pre-event OSINT
   warm-up") — solve 3 no-login challenges via a QR
   code, collect up to 3 redeemable codes
2. `/` → `/signup` — sign up with Google, or email/password (both create a
   Prisma-backed `User`)
3. `/form` — reachable immediately, any time after login. Set username +
   year (`PATCH /api/user/me`) and redeem any OSINT codes from step 1
   (`POST /api/osint/redeem`) for bonus points, before the quiz even opens
4. `/quizz` — this is where the live event-status gate actually applies;
   bounces to `/notstarted` if the event hasn't opened yet. Once open,
   `POST /api/quiz/start` fetches the (answer-free) question set and
   starts the server-side timer; each pick is stored locally until the
   last question or the timer hits zero, then one `POST /api/quiz/submit`
   grades everything server-side and adds to (not overwrites) their points
5. `/played` — shows the real score, read fresh from the DB. This is the
   end of the line for a regular user - no leaderboard access.

## API reference

All responses are JSON. Endpoints under `/api/quiz/*`, `/api/user/me`, and
everything under `/api/admin/*` require an authenticated session (the
cookie Auth.js sets on sign-in); `/api/admin/*` additionally requires
`isAdmin`, checked server-side on every request regardless of what the
client's session claims.

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
`points` (doesn't overwrite) so any OSINT bonus survives, and sets `played`.

### `GET /api/osint/challenge`
Public. Reads/sets an anonymous session cookie. Returns the currently
unlocked challenge (no answer included) and the (static, shared) codes
already earned by this session:
```json
{ "totalChallenges": 3, "completedCount": 1, "allDone": false,
  "currentChallenge": { "id": 2, "order": 2, "description": "..." },
  "earnedCodes": [{ "order": 1, "code": "NX-7V4Z8MV8", "points": 15 }] }
```

### `POST /api/osint/submit`
Public. `{ "challengeId": 2, "answer": "..." }`. Only accepts the one
challenge this session is currently allowed to attempt. On a correct
answer, returns that challenge's fixed code (the same value every solver
gets):
```json
{ "correct": true, "code": "NX-9FP292VA", "points": 20 }
```

### `POST /api/osint/redeem`
Requires auth. `{ "code": "NX-9FP292VA" }`. Looks up the challenge by its
static code, increments the caller's `points`, and records the redemption
against that user (409 if *this user* already redeemed that challenge -
other users can still redeem the same code once each).

### `GET /api/admin/scoreboard`
Admin-only. `{ "players": [{ "id", "username", "name", "points", "year" }, ...] }`,
sorted by points, only includes users who've played.

### `GET /api/admin/osint-stats`
Admin-only. Per-challenge code, solved count, and redeemed count.

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
