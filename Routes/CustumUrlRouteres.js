const express = require('express');
const router = express.Router();

const UrlMap = require('../Schemas/UrlMaps');
const isValidUrl = require('../lib/validate');
const requireAuthOrQuickShorten = require('../lib/requireAuthOrQuickShorten');
const { str, ALIAS_RE, errorRedirect } = require('../lib/input');

// Custom-alias links. A logged-out visitor hitting this still goes through
// requireAuthOrQuickShorten like any other protected action: they get
// bounced to /login with the submission saved, and it's replayed by
// resumePendingAction once they sign in.
router.post('/', requireAuthOrQuickShorten, async (req, res) => {
    const longUrl = str(req.body.longUrl);
    const customCode = str(req.body.customCode);
    const description = str(req.body.description).slice(0, 200);

    if (!isValidUrl(longUrl)) {
        return errorRedirect(res, 'That is not a valid URL.');
    }
    if (!ALIAS_RE.test(customCode)) {
        return errorRedirect(res, 'Custom aliases are 3-32 characters: letters, numbers, - and _.');
    }
    if (await UrlMap.exists({ shortUrl: customCode })) {
        return errorRedirect(res, 'That alias is already taken.');
    }

    try {
        await UrlMap.create({ shortUrl: customCode, longUrl, description, owner: req.session.user._id });
    } catch (err) {
        // Lost a race with another request for the same alias.
        if (err.code === 11000) return errorRedirect(res, 'That alias is already taken.');
        throw err;
    }
    res.redirect('/dashboard');
});

module.exports = router;
