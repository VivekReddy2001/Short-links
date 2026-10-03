const express = require('express');
const router = express.Router();

const UrlMap = require('../Schemas/UrlMaps');
const generateHash = require('../lib/generateHash');
const isValidUrl = require('../lib/validate');
const requireAuthOrQuickShorten = require('../lib/requireAuthOrQuickShorten');
const { str, ALIAS_RE } = require('../lib/input');

// Landing page: the "Generate Short URL" form, open to everyone.
router.get('/', (req, res) => {
    res.render('home', { shortUrl: null, error: null, longUrl: '' });
});

// Anonymous/general shortening. requireAuthOrQuickShorten lets this through
// even when nobody is logged in, because the submit button is literally
// labelled "Generate Short URL".
router.post('/', requireAuthOrQuickShorten, async (req, res) => {
    const longUrl = str(req.body.longUrl);
    if (!isValidUrl(longUrl)) {
        return res.status(400).render('home', {
            shortUrl: null,
            error: 'That does not look like a valid URL. Include the http(s):// prefix.',
            longUrl,
        });
    }

    const signedIn = Boolean(req.session.user);
    const shortUrl = await generateHash();
    await UrlMap.create({
        shortUrl,
        longUrl,
        description: signedIn ? str(req.body.description).slice(0, 200) : '',
        owner: signedIn ? req.session.user._id : null,
    });

    res.render('home', {
        shortUrl: `${req.protocol}://${req.get('host')}/${shortUrl}`,
        error: null,
        longUrl: '',
    });
});

// Resolve a short link and send the visitor on their way.
// Kept last so it doesn't shadow the other top-level routes mounted in app.js.
router.get('/:code', async (req, res, next) => {
    const { code } = req.params;
    if (!ALIAS_RE.test(code)) return next();

    const urlMap = await UrlMap.findOneAndUpdate({ shortUrl: code }, { $inc: { clicks: 1 } });
    if (!urlMap) {
        return res.status(404).render('404', { code });
    }
    res.redirect(302, urlMap.longUrl);
});

module.exports = router;
