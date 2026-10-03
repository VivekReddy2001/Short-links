const { rateLimit } = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000;

function limiter(limit, message) {
    return rateLimit({
        windowMs: WINDOW_MS,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        // Only throttle submissions; page views are free.
        skip: (req) => req.method !== 'POST',
        handler: (req, res) => {
            res.status(429).render('429', { message });
        },
    });
}

/** Brute-force protection for sign-in and registration. */
const authLimiter = (limit = 20) =>
    limiter(limit, 'Too many sign-in attempts. Wait a few minutes and try again.');

/** Spam protection for link creation. */
const shortenLimiter = (limit = 60) =>
    limiter(limit, 'You are creating links too quickly. Wait a few minutes and try again.');

module.exports = { authLimiter, shortenLimiter };
