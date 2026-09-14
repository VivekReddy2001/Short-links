# Security notes

An honest list of what's been fixed and what's still worth knowing before you put this in front of real users.

## Fixed while rebuilding this project

### 1. Live database credentials were committed to the repo, in plaintext, on GitHub — Critical

`database.js` used to contain a hardcoded MongoDB Atlas connection string with a real username and password, committed directly to a public repository:

```js
mongoose.connect("mongodb+srv://Zeroop:oIX5D0iqtmb1EeCx@cluster0.ob5ye5g.mongodb.net/...")
```

`database.js` now reads the connection string from `process.env.MONGODB_URI` (see `.env.example`) and refuses to start if it's missing, instead of silently hanging.

**This doesn't undo the exposure.** That password has been sitting in public GitHub history since this repo was first pushed, and history rewrites don't reliably scrub it (forks, caches, and anyone who already cloned it keep the old commits). If `Zeroop` / that Atlas cluster is still a real, in-use account:

- Rotate the database user's password in MongoDB Atlas now.
- Consider it compromised — check the cluster's access logs for any activity you don't recognize.

### 2. `javascript:` / `data:` URLs could be shortened — Low

`validate.js` used to accept anything `new URL()` could parse, which includes non-http schemes. A shortened link now has to be `http://` or `https://`.

## Still true of this app — read before deploying it for real

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | No CSRF protection | Medium | Every state-changing route (`/login`, `/register`, `/`, `/app/`, `/addcollections`, `/change_collection`) is a plain form POST with no CSRF token. A malicious page could submit these on a logged-in user's behalf. Add `csurf` or a same-site-cookie + custom-header check before this goes anywhere public. |
| 2 | No rate limiting | Medium | Login, registration, and link creation all have no throttling — open to password-guessing and link-creation spam. `express-rate-limit` on `/login` and `/` is the cheap fix. |
| 3 | Open redirect by design | Low–Medium | Any short link redirects to whatever URL was given, with no allow/deny list. That's the entire point of a URL shortener, but it also makes this a ready-made phishing-link generator if it's ever exposed publicly without abuse controls (report/takedown flow, domain blocklist, etc.). |
| 4 | No account recovery | Low | There's no email field, no password reset. Forget your password and the account is unrecoverable as it stands. |
| 5 | No login throttling / lockout | Low | Combined with #2, an attacker can brute-force a weak password with no friction. |
| 6 | Minimum password length is 6 | Low | `registerRouter.js` enforces `>= 6` characters and nothing else. Fine for a demo, thin for production. |
| 7 | Sessions are cookie + server-memory only | Info | `express-session`'s default `MemoryStore` is used, which is explicitly not meant for production (it leaks memory and doesn't survive a restart or scale past one process). Swap in `connect-mongo` or `connect-redis` before deploying more than one instance. |

None of table items 1–7 were introduced by this rebuild — they're gaps in the original design that are worth knowing about now that the app actually runs. The credential leak above was the one genuinely urgent finding.
