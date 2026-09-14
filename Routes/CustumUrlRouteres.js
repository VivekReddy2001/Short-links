const express = require('express');
const router = express.Router();

const UrlMap = require('../Schemas/UrlMaps');
const isValidUrl = require('../validate');
const requireAuthOrQuickShorten = require('../middleware');

// Custom-alias links. A logged-out visitor hitting this still goes through
// middleware.js like any other protected action: they get bounced to
// /login/ /register with the submission saved, and it's replayed by
// resumePendingAction once they sign in.
router.post('/', requireAuthOrQuickShorten, async (req, res) => {
    const longUrl = (req.body.longUrl || '').trim();
    const customCode = (req.body.customCode || '').trim();

    if (!isValidUrl(longUrl)) {
        return res.redirect('/dashboard?error=' + encodeURIComponent('That is not a valid URL.'));
    }
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(customCode)) {
        return res.redirect(
            '/dashboard?error=' +
                encodeURIComponent('Custom aliases are 3-32 characters: letters, numbers, - and _.')
        );
    }

    const taken = await UrlMap.findOne({ shortUrl: customCode });
    if (taken) {
        return res.redirect('/dashboard?error=' + encodeURIComponent('That alias is already taken.'));
    }

    await UrlMap.create({
        shortUrl: customCode,
        longUrl,
        owner: req.session.user._id,
    });
    res.redirect('/dashboard');
});

module.exports = router;
