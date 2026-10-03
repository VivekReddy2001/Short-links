const crypto = require('crypto');

// Synchronizer-token CSRF protection. Every session gets one random token;
// every form renders it as a hidden `_csrf` field; every state-changing
// request must send it back. A page on another site can make the browser
// submit one of our forms, but it cannot read the token to include it.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function tokenFor(req) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    }
    return req.session.csrfToken;
}

function attach(req, res, next) {
    // Lazy: the token (and with it a stored session) is only created when a
    // page is actually rendered. Visitors who just follow a short link and
    // get redirected never get a session.
    Object.defineProperty(res.locals, 'csrfToken', {
        enumerable: true,
        get: () => tokenFor(req),
    });
    next();
}

function verify(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();
    const sent = req.body && typeof req.body._csrf === 'string' ? req.body._csrf : '';
    const expected = req.session.csrfToken || '';
    const ok =
        sent.length > 0 &&
        sent.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
    if (ok) return next();
    const err = new Error('Invalid or missing CSRF token');
    err.code = 'EBADCSRFTOKEN';
    return next(err);
}

module.exports = { attach, verify, tokenFor };
