const express = require('express');
const router = express.Router();

const UrlMap = require('../Schemas/UrlMaps');
const Collection = require('../Schemas/Collection');
const requireLogin = require('../lib/requireLogin');
const { str, escapeRegex } = require('../lib/input');

router.use(requireLogin);

router.get('/', async (req, res) => {
    const ownerId = req.session.user._id;
    const q = str(req.query.q).slice(0, 100);

    // Search matches the description, the destination and the short code,
    // case-insensitively. The query is escaped, so it is matched literally.
    const filter = { owner: ownerId };
    if (q) {
        const re = new RegExp(escapeRegex(q), 'i');
        filter.$or = [{ description: re }, { longUrl: re }, { shortUrl: re }];
    }

    const [urls, collections] = await Promise.all([
        UrlMap.find(filter).sort({ createdAt: -1 }).lean(),
        Collection.find({ owner: ownerId }).sort({ name: 1 }).lean(),
    ]);

    const urlsByCollection = new Map();
    const uncategorized = [];
    for (const url of urls) {
        const key = url.collectionId ? String(url.collectionId) : null;
        if (key) {
            if (!urlsByCollection.has(key)) urlsByCollection.set(key, []);
            urlsByCollection.get(key).push(url);
        } else {
            uncategorized.push(url);
        }
    }

    res.render('dashboard', {
        host: `${req.protocol}://${req.get('host')}`,
        collections,
        urlsByCollection,
        uncategorized,
        q,
        resultCount: urls.length,
        error: str(req.query.error) || null,
    });
});

module.exports = router;
