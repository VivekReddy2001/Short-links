const express = require('express');
const router = express.Router();

const UrlMap = require('../Schemas/UrlMaps');
const generateHash = require('../generateHash');
const isValidUrl = require('../validate');
const requireAuthOrQuickShorten = require('../middleware');

// Landing page: the "Generate Short URL" form, open to everyone.
router.get('/', (req, res) => {
    res.render('home', { shortUrl: null, error: null, longUrl: '' });
});

// Anonymous/general shortening. middleware.js lets this through even when
// nobody is logged in, because the submit button is literally labelled
// "Generate Short URL".
router.post('/', requireAuthOrQuickShorten, async (req, res) => {
    const longUrl = (req.body.longUrl || '').trim();
    if (!isValidUrl(longUrl)) {
        return res.render('home', {
            shortUrl: null,
            error: 'That does not look like a valid URL. Include the http(s):// prefix.',
            longUrl,
        });
    }

    const shortUrl = await generateHash();
    await UrlMap.create({
        shortUrl,
        longUrl,
        owner: req.session.user ? req.session.user._id : null,
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
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(code)) return next();

    const urlMap = await UrlMap.findOneAndUpdate(
        { shortUrl: code },
        { $inc: { clicks: 1 } }
    );
    if (!urlMap) {
        return res.status(404).render('404', { code });
    }
    res.redirect(urlMap.longUrl);
});

module.exports = router;
