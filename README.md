# Short-links

A small self-hosted URL shortener. Paste a long URL, get a short one back — no account needed. Sign in and you also get custom aliases, a dashboard of everything you've shortened with live click counts, and collections to file your links into.

## What changed when this was published

This repo, as originally uploaded, had `app.js` requiring a `Routes/` and `Schemas/` directory that didn't exist anywhere in its git history — the routing layer and data models were never committed, so the app couldn't start. It also had a live MongoDB Atlas password committed in plaintext.

Rebuilding this was a bigger job than a typical cleanup, so here's exactly what was done, grouped by how invasive it was:

| Change | Why |
|---|---|
| **Wrote `Routes/*.js` and `Schemas/*.js` from scratch** | These were referenced by `app.js` and `generateHash.js` but never existed in the repo. The route names, the middleware's redirect-then-resume dance, and the collections feature implied by `addCollections`/`ChangeCollectionRoutner` were all inferred from the files that *did* exist and built out to match. |
| **Moved the database credentials out of source** | `database.js` had a real Atlas username and password hardcoded and committed. See **Security** below — this one's urgent. |
| **Fixed a route-mounting order bug** | The short-link resolver (`GET /:code`) would have shadowed `/dashboard`, `/addcollections`, etc. if mounted before them; fixed the order in `app.js`. |
| **Fixed a Mongoose field-name collision** | A schema field named `collection` collides with a reserved property every Mongoose document has; renamed to `collectionId`. Found this by actually running the app against a real database, not by inspection. |
| **Removed unused/duplicate/deprecated dependencies** | `package.json` listed `curl`, `url-exist`, `url-exists`, `url-validation`, `valid-url`, and `shortid` — none of them used anywhere in the code, several overlapping, `shortid` deprecated. Also added `dotenv` and `express-async-errors`, both of which the rebuilt app needs. |
| **Restricted shortenable URLs to http/https** | `validate.js` accepted any scheme `new URL()` could parse, including `javascript:`. Narrowed it to `http:`/`https:`. |
| **Wrote the views, CSS, and the rest of the plumbing (sessions, error handling, 404/500 pages) needed to actually run it** | There was no `views/` or `public/` directory either. |

Everything above is a from-scratch build against the shape the existing files implied, not a restoration of lost code — there was no original app.js/database.js worth diffing against for the missing pieces. See `docs/ARCHITECTURE.md` for how it all fits together.

## Security — read this first if you're the original account holder

**The MongoDB credentials that used to be hardcoded in `database.js` were public on GitHub.** If `Zeroop` on that Atlas cluster is a real, still-used account, rotate its password now and check the cluster's access logs. Full details in [`SECURITY.md`](SECURITY.md), along with a list of gaps (no CSRF protection, no rate limiting, and a few others) worth knowing about before this goes anywhere with real users.

## Getting started

You'll need Node 18+ and either a local MongoDB or a free [Atlas](https://www.mongodb.com/atlas) cluster.

```bash
git clone https://github.com/VivekReddy2001/Short-links.git
cd Short-links
npm install
cp .env.example .env
# edit .env: set MONGODB_URI to your database, and SESSION_SECRET to a random string
npm start
```

Then open `http://localhost:3000`. `npm run dev` runs it under `nodemon` instead, restarting on file changes.

## How it works

- **Anyone** can shorten a URL from the home page — no account required.
- **Signed-in users** additionally get:
  - a **custom alias** instead of a random 6-character code (`/dashboard` → "Create a custom link"),
  - a **dashboard** listing every link they've made, with click counts,
  - **collections** to group links into named folders.
- If you try to create a custom link while logged out, you're sent to `/login`; log in or register and the link you were making gets created automatically once you're signed in. This is the one piece of non-obvious logic in the app — see `docs/ARCHITECTURE.md` for the sequence diagram.

## Project structure

```
app.js                    # Express app, session/view setup, route mounting
database.js                # Mongo connection (reads MONGODB_URI)
generateHash.js            # random 6-char code generator, checks for collisions
validate.js                 # http(s)-only URL validation
middleware.js               # "signed in, or this is the anonymous quick-shorten button" gate
requireLogin.js             # plain "must be signed in" gate
resumePendingAction.js       # finishes a queued shorten-while-logged-out request after login
Routes/
  homeRouter.js              # GET /, POST /, GET /:code (resolve + redirect)
  loginRouter.js, registerRouter.js, logoutRouter.js
  dashboardRouter.js
  CustumUrlRouteres.js        # POST /app/ — custom-alias links
  addCollections.js           # POST /addcollections
  ChangeCollectionRoutner.js  # POST /change_collection — file a link into a collection
Schemas/
  User.js, Collection.js, UrlMaps.js
views/                       # EJS templates
public/css/style.css
docs/ARCHITECTURE.md
SECURITY.md
```

## Tech stack

| Layer | Choice |
|---|---|
| Server | Express 4 |
| Views | EJS (server-rendered, no client-side framework) |
| Database | MongoDB via Mongoose |
| Auth | `express-session` (cookie + in-memory store) + `bcrypt` password hashing |
| Config | `dotenv` — see `.env.example` |

## Testing this rebuild

Every route above was exercised against a real local MongoDB and a real running instance of the app — anonymous shortening, registration, login, custom aliases (including the duplicate-alias rejection), collections, moving a link between collections, the login-redirect-and-resume handshake, short-link resolution with click counting, and the 404 page for an unknown code. Not a test suite (there isn't one yet — see below), but a real end-to-end run of every feature this README claims exists.

## Roadmap / good first contributions

- An actual test suite — none of the manual verification above is automated yet.
- Address the gaps in `SECURITY.md`: CSRF protection and rate limiting are the two that matter most before any public deployment.
- Password reset / account recovery.
- A "delete link" and "delete collection" action — there's currently no way to remove either once created.
- Swap `express-session`'s default `MemoryStore` for `connect-mongo` before running more than one instance.

## License

MIT — see [`LICENSE`](LICENSE).

## Author

Vivek Reddy ([@VivekReddy2001](https://github.com/VivekReddy2001))
