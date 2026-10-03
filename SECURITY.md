# Security notes

An honest list of what's been fixed and what's still worth knowing before you put this in front of real users.

## Fixed while rebuilding this project

### 1. Live database credentials were committed to the repo, in plaintext, on GitHub — Critical

`database.js` used to contain a hardcoded MongoDB Atlas connection string with a real username and password, committed directly to a public repository:

```js
mongoose.connect("mongodb+srv://Zeroop:<redacted>@cluster0.<redacted>.mongodb.net/...")
```

`database.js` now reads the connection string from `process.env.MONGODB_URI` (see `.env.example`) and refuses to start if it's missing, instead of silently hanging.

**This doesn't undo the exposure.** That password has been sitting in public GitHub history since this repo was first pushed, and history rewrites don't reliably scrub it (forks, caches, and anyone who already cloned it keep the old commits). If `Zeroop` / that Atlas cluster is still a real, in-use account:

- Rotate the database user's password in MongoDB Atlas now.
- Consider it compromised — check the cluster's access logs for any activity you don't recognize.

### 2. `javascript:` / `data:` URLs could be shortened — Low

`lib/validate.js` used to accept anything `new URL()` could parse, which includes non-http schemes. A shortened link now has to be `http://` or `https://`.

### 3. No CSRF protection — Medium

Every state-changing route is a form POST, and none carried a token, so a malicious page could submit them on a signed-in user's behalf. Every form now carries a per-session synchronizer token (`lib/csrf.js`), checked on every POST; a missing or wrong token gets a 403. Logout, previously a plain GET link that any `<img>` tag could trigger, is now a POST with the token.

### 4. No rate limiting — Medium

Sign-in and registration are limited to 20 POSTs per 15 minutes per IP, and link creation to 60 (`lib/rateLimit.js`), which blunts password guessing and link spam.

### 5. Session fixation — Medium

The session id was kept across sign-in, so an id planted on a victim before they logged in would be valid afterwards. Signing in now always regenerates the session (`lib/session.js`).

### 6. Sessions held in server memory — Low

`express-session`'s default `MemoryStore` leaks memory and loses every sign-in on restart. Sessions are now stored in MongoDB through `connect-mongo`, with a one-week TTL.

### 7. Malformed input crashed requests — Low

`username[$ne]=x`-style fields produced objects that crashed `.trim()` (a 500 error) and could reach queries; invalid ObjectIds threw cast errors. Forms are now parsed with `extended: false` (every field is a string), every field goes through `lib/input.js`, and ids are validated before any query.

### 8. Predictable short codes and username enumeration — Low

Random codes came from `Math.random()`; they now come from `crypto.randomInt()`, so nobody can predict the next code to enumerate other people's links. A failed login for an unknown username now takes as long as a wrong password (a dummy bcrypt comparison), so timing no longer reveals which usernames exist.

## Still true of this app — read before deploying it for real

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | Open redirect by design | Low–Medium | Any short link redirects to whatever URL was given, with no allow/deny list. That's the entire point of a URL shortener, but it also makes this a ready-made phishing-link generator if it's ever exposed publicly without abuse controls (report/takedown flow, domain blocklist, etc.). |
| 2 | No account recovery | Low | There's no email field, no password reset. Forget your password and the account is unrecoverable as it stands. |
| 3 | No per-account lockout | Low | Rate limiting is per IP. A distributed guessing attack against one account is slowed, not stopped. |
| 4 | Rate-limit counters live in memory | Info | Each app process counts separately. Behind several processes, use a shared store (e.g. `rate-limit-mongo` or Redis). |

## Reporting a vulnerability

Please open a GitHub issue *without* exploit details, or contact the maintainer directly via the email on the GitHub profile, and allow a reasonable time for a fix before public disclosure.
