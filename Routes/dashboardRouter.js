const express = require('express');
const router = express.Router();

const UrlMap = require('../Schemas/UrlMaps');
const Collection = require('../Schemas/Collection');
const requireLogin = require('../requireLogin');

router.use(requireLogin);

router.get('/', async (req, res) => {
    const ownerId = req.session.user._id;
    const [urls, collections] = await Promise.all([
        UrlMap.find({ owner: ownerId }).sort({ createdAt: -1 }).lean(),
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
        error: req.query.error || null,
    });
});

module.exports = router;
