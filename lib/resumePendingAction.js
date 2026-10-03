const UrlMap = require('../Schemas/UrlMaps');
const isValidUrl = require('./validate');
const generateHash = require('./generateHash');
const { str, ALIAS_RE } = require('./input');

// After requireAuthOrQuickShorten redirects an anonymous user to /login, the
// form data they were about to submit sits on req.session.addUrl. Call this
// right after a successful login or registration to finish that submission
// (a custom-alias link, in practice) under the account they just signed
// into. Silently does nothing if there was no pending action, or if it
// turns out to be invalid/taken by the time they log in.
async function resumePendingAction(req) {
    const pending = req.session.addUrl;
    delete req.session.addUrl;
    if (!pending) return null;

    const longUrl = str(pending.longUrl);
    if (!isValidUrl(longUrl)) return null;

    const customCode = str(pending.customCode);
    if (customCode) {
        if (!ALIAS_RE.test(customCode)) return null;
        if (await UrlMap.exists({ shortUrl: customCode })) return null;
    }

    return UrlMap.create({
        shortUrl: customCode || (await generateHash()),
        longUrl,
        description: str(pending.description).slice(0, 200),
        owner: req.session.user._id,
    });
}

module.exports = resumePendingAction;
