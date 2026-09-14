const UrlMap = require('./Schemas/UrlMaps');
const isValidUrl = require('./validate');

// After middleware.js redirects an anonymous user to /login, the form data
// they were about to submit sits on req.session.addUrl. Call this right
// after a successful login or registration to finish that submission (a
// custom-alias link, in practice — CustumUrlRouteres is the only route
// that goes through middleware for a logged-out user) under the account
// they just signed into. Silently does nothing if there was no pending
// action, or if it turns out to be invalid/taken by the time they log in.
async function resumePendingAction(req) {
    const pending = req.session.addUrl;
    delete req.session.addUrl;
    if (!pending || !pending.longUrl) return null;

    const longUrl = String(pending.longUrl).trim();
    if (!isValidUrl(longUrl)) return null;

    const customCode = (pending.customCode || '').trim();
    if (customCode) {
        if (!/^[a-zA-Z0-9_-]{3,32}$/.test(customCode)) return null;
        const taken = await UrlMap.findOne({ shortUrl: customCode });
        if (taken) return null;
    }

    const generateHash = require('./generateHash');
    const shortUrl = customCode || (await generateHash());

    return UrlMap.create({
        shortUrl,
        longUrl,
        owner: req.session.user._id,
    });
}

module.exports = resumePendingAction;
