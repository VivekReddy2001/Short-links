# Contributing

## Setup

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI and SESSION_SECRET
npm run dev             # nodemon, restarts on change
```

You need a MongoDB instance to run this against — a local `mongod` or a free Atlas cluster both work.

## Things worth knowing before you change anything

- **Don't name a Mongoose schema field `collection`.** It collides with a property every Mongoose document reserves for its underlying collection handle, and fails at model-compile time with an unhelpful `Cannot read properties of undefined` error. `Schemas/UrlMaps.js` uses `collectionId` for exactly this reason.
- **Route mount order in `app.js` matters.** `homeRouter` owns `GET /:code`, a catch-all for resolving short links, and has to stay mounted *after* every other router or it'll intercept their paths first.
- **`middleware.js` and `requireLogin.js` are deliberately different.** `middleware.js` lets an anonymous "Generate Short URL" submission through; `requireLogin.js` is a flat "must be signed in" gate for pages with no anonymous path (the dashboard). Don't collapse them into one.
- **No test suite yet.** Every feature was verified manually end-to-end against a real database before this was published (see the README's "Testing this rebuild" section) — that verification isn't automated. Adding real tests is one of the more valuable first contributions.
- **Never commit real credentials.** `.env` is git-ignored; `.env.example` holds placeholders only. This project already leaked a live database password once — see `SECURITY.md`.

## Good first contributions

See the Roadmap section in `README.md` and the findings table in `SECURITY.md`. CSRF protection and rate limiting are the two most worth tackling next.

## Pull requests

- Keep PRs focused — one change per PR is easier to review than a bundle.
- If you touch a route or schema, say in the PR description how you tested it (which flows you exercised, against what).
- Update `README.md` / `docs/ARCHITECTURE.md` if the change affects how the app is used or structured.
