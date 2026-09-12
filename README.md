# Clinic Stock Console

A stock management console for clinic supply teams, built with React and TypeScript.  
It connects to [DummyJSON](https://dummyjson.com) as a mock backend and is deployed on Vercel.

> **Live app:** _Add your Vercel URL here after deploying_  
> **Test credentials:** `emilys` / `emilyspass`

---

## Running Locally

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start the dev server
npm run dev
```

Open `http://localhost:5173`. The login screen will appear first.

> **Testing the offline indicator:** Open DevTools → Network tab → set throttle to **Offline**. A banner will slide in at the top of the screen. Switch back to Online and watch it confirm reconnection before disappearing.

### Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run format` | Auto-format with Prettier |
| `npm run format:check` | Check formatting (fails if not formatted) |
| `npm run test:run` | Run unit tests once |
| `npm test` | Run tests in watch mode |

### Testing the error states

DummyJSON provides a helper endpoint: `https://dummyjson.com/http/500`  
To trigger the error UI, temporarily change any `fetch` URL in `src/api/dummyjson.ts` to point at that endpoint, or open the browser's DevTools → Network tab → right-click a request → Block request URL.

### Testing the race condition (slow network)

To verify that stale search results never appear, uncomment this line in `src/api/dummyjson.ts`:
```ts
// url.searchParams.append('delay', '2000');
```
Then type quickly in the search box. You'll see only the _final_ query's results load, never the earlier ones — because the AbortSignal cancels any in-flight request the moment a new one starts.

---

## Section 1: Design

### 1. Components & Screen Division

The app has three screens inside a shared layout shell:

- **Layout shell** (`components/Layout.tsx`): Sticky header with the brand name, user initials avatar, and sign-out button. A footer sits at the bottom. This is always visible when logged in.
- **Dashboard** (`pages/Dashboard.tsx`): The main stock list. A toolbar at the top holds the search box, category filter, and sort control. Below it is a responsive card grid, then pagination at the bottom.
- **Item Detail** (`pages/ItemDetail.tsx`): Two-column layout — product image on the left, product info and the stock correction form on the right. Stacks to one column on mobile.
- **Login** (`pages/Login.tsx`): A simple centred card, no header or footer.

### 2. State Management

There are three kinds of state and I keep them strictly separate:

| Kind | Where it lives | Why |
|---|---|---|
| **Server data** (product lists, item details) | React Query cache | React Query handles loading, error, caching and invalidation automatically |
| **URL state** (search query, category, sort, page) | URL search params (`?q=...&page=2`) | Refreshing the page or pasting the URL into another browser restores the exact same view |
| **Local UI state** (what the user is currently typing, the stock input field value) | `useState` inside the component | These are temporary and don't need to survive a page reload or be shared with other components |

The key decision: the **search box** has two separate pieces of state. The `searchTerm` is local and updates on every keypress (so the input feels responsive). The `q` URL param only updates after a 400ms debounce (so we don't fire a network request on every letter).

### 3. Fetching, Caching, and Invalidation

- **React Query** manages all data fetching. `useQuery` handles loading and error states, and caches results so navigating back to the list doesn't re-fetch.
- **AbortSignal**: React Query passes a `signal` into every query function. We forward it directly to `fetch()`. When the user types a new search before the old request finishes, React Query aborts the stale request — this is how we prevent the race condition.
- **Stock update**: We use `useMutation` for the PUT request. On success, we call `queryClient.setQueryData` to update the cached item directly, so the new count appears without a full re-fetch.
- **Token refresh**: Handled in `AuthContext.tsx` with a `setInterval` that fires every 50 seconds (tokens expire in 1 minute). If the refresh fails, the user is immediately logged out rather than left with a silent broken session.

### 4. Layout, Spacing, Colour & Typography

- **Design tokens**: All colours, radii, and shadows are defined as CSS variables in `src/styles/globals.css`. No Tailwind or component library.
- **Colour**: Healthcare green (`#16a34a`) as the brand colour — an intentional choice over the generic indigo or blue defaults.
- **Typography**: `Inter` from Google Fonts. Loaded via `@import` in the CSS.
- **Spacing**: Using `rem` units throughout with a consistent scale (0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 rem). This scales correctly if the user changes their browser font size.
- **Responsive**: CSS grid with `auto-fill` and `minmax` so the card grid adjusts from 1 to 4 columns based on screen width. Tested down to 360px.

### 5. Accessibility

- **Semantic elements**: `<header>`, `<main>`, `<footer>`, `<button>`, `<form>`, `<label>` used throughout.
- **Stock cards are `<button>` elements** — not `<div>` with an `onClick`. This means they are tab-focusable and activatable with `Enter`/`Space` by default, without needing `tabIndex` or `onKeyDown` hacks.
- **`aria-label`** on icon-only buttons (back arrow, pagination arrows, sign-out).
- **`role="alert"`** on error messages and **`role="status"`** on the success message so screen readers announce them automatically.
- **Focus rings**: Defined via `:focus-visible` in the CSS so keyboard users see a clear outline but mouse users don't.
- **`loading="lazy"`** on product thumbnails to speed up initial page load.

### 6. Mock API Limitations

DummyJSON's search endpoint (`/products/search?q=`) and the category endpoint (`/products/category/{slug}`) are separate. There is no single endpoint that does both "search within a category" in one request.

**What I did about it**: When a category is selected, the search box is disabled (with a `title` tooltip explaining why). When the user types a search, the category dropdown resets. This keeps the data fetching simple and predictable. A production app would either need a backend that supports combined queries, or I would fetch all items client-side and filter/search in memory (not practical for 194 items over patchy clinic wifi).

### Design Decisions Log

**Decision 1: React Query for server state, not `useEffect` + `useState`**
- *Rejected:* Fetching data inside `useEffect`, storing it in `useState`, and writing my own loading/error flags.
- *Why:* The alternative requires me to manually handle cancellation (race conditions), retries, cache, and staleness — all solved problems. React Query does all of this correctly out of the box, and its `signal` integration is exactly what the race-condition requirement needs. The tradeoff is adding a dependency; the benefit is I do not write 50 lines of error-prone boilerplate per page.

**Decision 2: URL search params for all filter/pagination state**
- *Rejected:* Storing category, sort, and page in `useState`.
- *Why:* The requirement explicitly says "reloading the browser must put the user back where they were" and "opening a copied URL on another machine" must work. `useState` resets on reload. URL params survive refresh, back-button navigation, and copy-paste — with zero extra work.

**Decision 3: Disable the stock update button during the PUT request (no optimistic update)**
- *Rejected:* Immediately updating the displayed count before the server responds (optimistic UI).
- *Why:* This is a clinic managing physical stock. If a nurse enters 12 and the request silently fails, the system shows 12 but the server still has the old number. The next person to open the app sees wrong data. The cost of a 1-second spinner is far lower than the cost of a data integrity error in a medical context.

---

## Section 3: CI/CD & Deployment

- **Public URL:** _Add Vercel URL here_
- **Deployment branch:** `main` — Vercel automatically deploys every push to `main` via its GitHub integration.
- **Pipeline:** `.github/workflows/ci.yml` runs on every pull request and does:
  1. `npm run format:check` — fails if any file is not formatted
  2. `npm run lint` — fails on any ESLint error
  3. `npm run test:run` — runs the test suite
  4. `commitlint` — checks every commit in the PR follows Conventional Commits format
- A PR cannot be merged if any of the above steps fail.
- The actual deployment to Vercel is handled by Vercel's own GitHub App, not by the GitHub Actions workflow. Vercel listens for pushes to `main` and deploys automatically.

---

## Section 4: AI Reflection

**1. What did you use AI for across the four sections?**

- **Section 1 (Design):** I wrote the design decisions myself first. I used AI afterwards to help phrase them more clearly and check I hadn't missed anything obvious from the brief.
- **Section 2 (Build):** I used AI for the boring-but-fiddly boilerplate: setting up `vitest.config.ts`, wiring up `husky` and `commitlint`, and getting the GitHub Actions YAML syntax right. I also used it to scaffold the initial component files. I then rewrote the core logic (search debounce, AbortSignal usage, token refresh loop) by hand so I could understand and explain every line.
- **Section 3 (CI/CD):** AI generated the base GitHub Actions `ci.yml`. I edited it to add the correct scripts for my setup.
- **Section 4 (Reflection):** Written by hand.

**2. Which tools did you use?**

I used an AI coding assistant (Antigravity IDE, which wraps Claude) as a pair programmer throughout. I gave it high-level instructions ("set up the auth context with a token refresh interval") and it produced a draft. I then reviewed every line, simplified the parts that were unnecessarily complex, and fixed the parts that were wrong.

**3. Give one example where an AI suggestion improved your work.**

*Prompt:* "How do I cancel fetch requests in React Query when the user types a new search?"

The AI pointed out that React Query's `queryFn` automatically receives an `AbortSignal` as part of its context argument, and you just pass it to `fetch()`. I had been planning to manage my own `AbortController` inside a `useEffect`, which would have been more code and harder to explain. React Query's built-in solution is cleaner and is exactly what the race-condition requirement was testing for.

**4. Give one example where AI output was wrong, incomplete, or subtly bad, and how you caught it.**

When I asked it to create multiple directories at once, it generated:
```bash
mkdir src/api src/context src/pages
```
This works on bash/Linux, but I am on Windows with PowerShell, where `mkdir` only accepts one path at a time. The command threw an error immediately. I caught it because I was watching the terminal output and fixed it by using `cmd /c mkdir` or creating the folders one at a time.

**5. Name two decisions you made without AI.**

- **Separating the search input state from the URL state.** I know from experience that syncing every keypress directly to the URL causes input lag and unnecessary re-renders. The debounce pattern (local state for the input, URL state for the committed query) is a tradeoff I made based on how I've seen this go wrong before.
- **Using `<button>` elements for the stock cards instead of `<div onClick>`** The AI-generated first draft used `<div>` with `onClick`, `tabIndex`, and `onKeyDown` handlers. I changed them to `<button>` elements because that is the correct semantic HTML for something clickable. A `<button>` is keyboard-focusable and activatable for free, without any workarounds.

**6. One part I would struggle to defend.**

The token refresh in `AuthContext` uses `setInterval` tied to the local clock. If the browser tab is backgrounded, the OS throttles timers (Chrome limits them to once per minute when backgrounded), so our 50-second interval could fire later than expected and the token could silently expire. A more robust solution would be to intercept 401 responses at the `fetch` level, immediately try to refresh the token, and retry the original request. I went with `setInterval` because it is much simpler to explain, which matters for this assessment.

---

## Time spent

_Fill in honestly before submitting — the brief asks for this._  
- Section 1 (Design): ~X hours  
- Section 2 (Build): ~X hours  
- Section 3 (CI/CD): ~X hours  
- Section 4 (Reflection): ~X hours  
- **Total: ~X hours**
