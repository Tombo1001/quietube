# YouTube Subscription Cleaner — Project Brief

## What We're Building

A static web app hosted on GitHub Pages that lets users OAuth into their YouTube account, pull all their subscriptions, and display them in a table sorted by **last upload date** (oldest/most inactive first). The goal is to make it easy to identify and unsubscribe from dead or dormant channels in one place.

There is no meaningful native YouTube solution for this. YouTube removed sort-by-upload-date from its UI and offers no way to view subscriptions by channel activity. Existing tools are either Chrome extensions (PocketTube, Unsubscriby) or developer CLI tools — none are a clean, hosted, no-install consumer webapp.

Name QuieTube. Highlight channels that you follow that have gone dark for quite some time. Lost to time, once enjoyed, now resigned to YouTube history. A respectful tribute to the browsers youtube subscriptions that don't provide entertainment anymore.

---

## Core Requirements

- **Fully static** — no backend, no server, deployable to GitHub Pages
- **Google OAuth via PKCE** — no client secret, entirely browser-side
- **YouTube Data API v3** — all calls made directly from the browser (CORS supported)
- **Display subscriptions in a sortable table** — default sort: last upload date ascending (most inactive first)
- **One-click unsubscribe** — using `subscriptions.delete` endpoint (already have subscription ID from list call)
- **No user accounts, no data collection** — all data stays in the browser

---

## Auth Flow

Use **OAuth 2.0 Authorization Code + PKCE** (no client secret required):

- Library: Google Identity Services JS (`https://accounts.google.com/gsi/client`)
- Scopes needed:
  - `https://www.googleapis.com/auth/youtube.readonly` — read subscriptions
  - `https://www.googleapis.com/auth/youtube` — required for unsubscribe (delete)
- Redirect URI must exactly match the GitHub Pages URL registered in Google Cloud Console
- Store access token in memory or `sessionStorage` only (not `localStorage`)

---

## API Calls Required

### 1. Fetch all subscriptions
```
GET https://www.googleapis.com/youtube/v3/subscriptions
  ?part=snippet
  &mine=true
  &maxResults=50
  &pageToken={nextPageToken}
```
Paginate until no `nextPageToken`. Each item gives: `channelId`, `title`, `thumbnailUrl`, `subscriptionId` (needed for delete).

### 2. Fetch last upload date per channel
For each channel:
```
GET https://www.googleapis.com/youtube/v3/channels
  ?part=contentDetails
  &id={channelId}
```
This returns the channel's **uploads playlist ID**.

Then:
```
GET https://www.googleapis.com/youtube/v3/playlistItems
  ?part=snippet
  &playlistId={uploadsPlaylistId}
  &maxResults=1
```
The first item's `snippet.publishedAt` is the last upload date.

### 3. Unsubscribe
```
DELETE https://www.googleapis.com/youtube/v3/subscriptions?id={subscriptionId}
```
Requires the `youtube` scope (read-write).

---

## Quota Considerations

YouTube Data API v3 gives **10,000 units/day** per project.

| Call | Cost |
|---|---|
| `subscriptions.list` (per page of 50) | 1 unit |
| `channels.list` (per channel) | 1 unit |
| `playlistItems.list` (per channel) | 1 unit |
| `subscriptions.delete` | 50 units |

For a user with 200 subscriptions: ~402 units to load everything. Deletions are expensive at 50 units each — warn users if they bulk delete.

**Mitigation:** Cache results in `localStorage` with a TTL (e.g. 24 hours) so repeat visits don't re-fetch everything.

---

## Table Columns

| Column | Source |
|---|---|
| Thumbnail | `subscription.snippet.thumbnails.default.url` |
| Channel Name | `subscription.snippet.title` |
| Last Upload | `playlistItems[0].snippet.publishedAt` |
| Days Inactive | Calculated from today |
| Subscriber Count | Optional: `channels.list?part=statistics` |
| Unsubscribe | Button — calls `subscriptions.delete` |

Default sort: **Days Inactive descending** (most dead channels first).
Allow column header click to re-sort.

---

## UX Flow

1. Landing page with "Sign in with Google" button and brief explanation
2. On auth success → begin fetching subscriptions (show progress bar — this can take a while for users with 500+ subs)
3. Fetch last upload per channel **in batches** (e.g. 10 concurrent requests) to avoid hammering the API
4. Render table as data arrives (progressive loading) — don't wait for all channels
5. User can sort, filter (e.g. "only show channels inactive for 1+ year"), and unsubscribe individually
6. On unsubscribe: remove row from table with animation, show undo toast for ~5 seconds

---

## Tech Stack

- **Language:** TypeScript throughout — strict mode enabled
- **Framework:** React 18 (via Vite) — compiled to static files, `npm run build` → `dist/`
- **Package manager:** npm
- **Styling:** Tailwind CSS
- **Component library:** shadcn/ui — built on Tailwind + Radix UI primitives, consistent with the styling approach and well supported
- **Data fetching:** TanStack Query (React Query v5) — handles the batched concurrent API calls to YouTube, manages loading/error states, and provides built-in caching that pairs well with the `localStorage` quota mitigation strategy
- **Build tool:** Vite with `vite-plugin-react` and static output
- **Deployment:** GitHub Actions CI/CD — push to `main` → build → deploy to `gh-pages` branch via `actions/deploy-pages`
- **No router needed** — single page app
- **No backend** — entirely client-side

---

## Monetisation

- **Google AdSense** blocks on the page — static hosting makes this straightforward
- **"Buy Me a Coffee" / Ko-fi** link in the header or footer
- No premium tier planned initially — unsubscribe is free
- If a premium tier is added later (e.g. bulk unsubscribe, scheduled re-checks), migrate to **Cloudflare Pages + Workers** for lightweight serverless payment verification

---

## Google Cloud Console Setup (for CLAUDE.md reference)

When setting up the OAuth client:
1. Create a new project in Google Cloud Console
2. Enable **YouTube Data API v3**
3. Create **OAuth 2.0 Client ID** → type: **Web application**
4. Add to **Authorised JavaScript origins**: `https://{username}.github.io`
5. Add to **Authorised redirect URIs**: `https://{username}.github.io/{repo-name}/`
6. API key (for non-authed calls if needed): restrict to YouTube Data API v3 and your domain

---

## Competitive Landscape (context)

- **PocketTube** — Chrome extension, does sort by activity, but requires install and is focused on grouping
- **Unsubscriby** — Chrome extension only
- **GitHub CLI tools** — developer-only, require API keys and local setup
- **YouTube native** — no sort by channel activity, removed sort-by-upload-date from UI entirely

**Gap:** No clean, hosted, no-install consumer webapp exists for this specific use case.

---

## Known Edge Cases to Handle

- Channels with **no uploads** (brand new or upload-disabled) — show "No uploads" rather than crashing
- **Deleted/terminated channels** — API will return an error; catch and show "Channel unavailable"
- Users with **500+ subscriptions** — batch fetching and progressive rendering are essential
- API quota exhaustion — detect 403 quota errors and show a friendly message with a "try again tomorrow" note
- Token expiry during a long fetch session — refresh or prompt re-auth gracefully

---

## Security

### Credential & Token Protection

- **Never commit credentials** — the Google OAuth Client ID goes in a `.env` file as `VITE_GOOGLE_CLIENT_ID`. Vite intentionally only exposes variables prefixed with `VITE_` to the client bundle. Add `.env` to `.gitignore` immediately at project creation, before the first commit.
- **No client secret** — the PKCE flow is specifically designed so no secret is needed. If Claude Code ever suggests adding a `client_secret` to the frontend, that is wrong — stop and correct it.
- **Access token storage** — store the OAuth access token in memory (a React ref or context value) only. Do not write it to `localStorage` or `sessionStorage`. It will be lost on page refresh, which is intentional — the user re-auths. Tokens in Web Storage are readable by any JS on the page including injected scripts.
- **Scopes** — request the minimum necessary. Use `youtube.readonly` for the read phase. Only request the full `youtube` scope at the point the user initiates an unsubscribe action, if you want to be strict about it. Never request `youtubepartner` or account management scopes.
- **GitHub Actions secrets** — if the Client ID is needed at build time, store it as a GitHub Actions secret (`VITE_GOOGLE_CLIENT_ID`), never hardcoded in workflow YAML.

### OWASP Top 10 — Applied to This App

**A01 — Broken Access Control**
All data access is gated behind the user's own OAuth token — the YouTube API enforces this server-side. On the client, ensure the unsubscribe button is never rendered or callable before a valid token is confirmed in state. Don't rely on UI hiding alone; the API call itself must always include the bearer token.

**A02 — Cryptographic Failures**
GitHub Pages serves over HTTPS by default — enforce it by enabling "Enforce HTTPS" in the repo Pages settings. Never downgrade to HTTP. The PKCE `code_verifier` must be generated using `crypto.getRandomValues()` (Web Crypto API), never `Math.random()`.

**A03 — Injection**
All channel names, descriptions, and thumbnails from the YouTube API must be rendered via React's JSX (which escapes by default) — never use `dangerouslySetInnerHTML` with API response data. If any channel metadata is ever written to the DOM directly, treat it as untrusted input.

**A04 — Insecure Design**
The unsubscribe action is destructive and not easily reversible by the user outside of manually re-subscribing. Design it with a confirmation step and a short undo window (toast with ~5s timer). Bulk unsubscribe, if added, should require an explicit "I understand this will unsubscribe X channels" confirmation.

**A05 — Security Misconfiguration**
In Google Cloud Console: restrict the OAuth client to your exact GitHub Pages origin only — no wildcards. Restrict the API key (if used) to the YouTube Data API v3 and your domain. Set up API key HTTP referrer restrictions. Disable any Google APIs in the project that aren't needed.

**A06 — Vulnerable and Outdated Components**
Run `npm audit` as part of the GitHub Actions build step — fail the build on high/critical vulnerabilities. Use `npm audit --audit-level=high`. Pin major versions in `package.json` and use Dependabot for automated PRs on dependency updates.

**A07 — Identification and Authentication Failures**
Token expiry must be handled gracefully — catch 401 responses from the YouTube API and prompt re-authentication rather than silently failing or showing broken UI. Never cache or persist tokens beyond the current session. Don't implement any "remember me" behaviour.

**A08 — Software and Data Integrity Failures**
Load the Google Identity Services script from the official origin (`https://accounts.google.com/gsi/client`) only — do not self-host or proxy it. Add a `Content-Security-Policy` meta tag restricting `script-src` to `'self'` and `https://accounts.google.com`. This also limits the blast radius of any supply chain attack via npm.

**A09 — Security Logging and Monitoring Failures**
This is a client-side app with no backend logging, which is mostly fine. However: catch and handle all API errors explicitly — don't swallow them silently. Display quota exhaustion (403) and auth errors (401) clearly to the user. If AdSense or any third-party script is added, audit what data it can access on the page.

**A10 — Server-Side Request Forgery (SSRF)**
Not applicable in a purely static client-side app — there is no server to forge requests from. If a backend is ever introduced (e.g. Cloudflare Workers for payments), revisit this.

---

## Local Testing Before Deployment

- Before we are ready to commit to pushing this to github pages, we should look to test using out local WSL ubuntu/docker (compose) environment. You should know how to get to that via ssh.
- When are have confirmed we are ready to deploy, create a deployment file with full, explicit instructions. This file should be kept in the .gitignore file so as to keep it private.