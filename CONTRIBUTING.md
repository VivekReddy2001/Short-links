# Contributing

## Setup

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI and SESSION_SECRET
npm run dev             # node --watch, restarts on change
npm test                # Jest + Supertest against an in-memory MongoDB
npm run lint            # ESLint
```

You need a MongoDB instance to run this against — a local `mongod` or a free Atlas cluster both work.

## Things worth knowing before you change anything

- **Don't name a Mongoose schema field `collection`.** It collides with a property every Mongoose document reserves for its underlying collection handle, and fails at model-compile time with an unhelpful `Cannot read properties of undefined` error. `Schemas/UrlMaps.js` uses `collectionId` for exactly this reason.
- **Route mount order in `app.js` matters.** `homeRouter` owns `GET /:code`, a catch-all for resolving short links, and has to stay mounted *after* every other router or it'll intercept their paths first.
- **`lib/requireAuthOrQuickShorten.js` and `lib/requireLogin.js` are deliberately different.** The first lets an anonymous "Generate Short URL" submission through; the second is a flat "must be signed in" gate for pages with no anonymous path (the dashboard). Don't collapse them into one.
- **Every form needs the CSRF field.** Add `<%- include('partials/csrf') %>` inside any new `<form method="POST">`, or the request is refused with a 403.
- **Read form fields through `lib/input.js`.** `str()` turns anything that isn't a string into `''`, and `isObjectId()` guards every id before it reaches a query.
- **Add a test with every change.** `tests/` drives the real app with Supertest against an in-memory MongoDB; `tests/helpers.js` has a `browser()` agent that submits forms with a valid CSRF token, the way a browser would.
- **Never commit real credentials.** `.env` is git-ignored; `.env.example` holds placeholders only. This project already leaked a live database password once — see `SECURITY.md`.

## Good first contributions

See the Roadmap section in `README.md` and the open items in `SECURITY.md`.

## Pull requests

- Keep PRs focused — one change per PR is easier to review than a bundle.
- If you touch a route or schema, say in the PR description how you tested it (which flows you exercised, against what).
- Update `README.md` / `docs/ARCHITECTURE.md` if the change affects how the app is used or structured.
