const express = require('express');
const router = express.Router();

const UrlMap = require('../Schemas/UrlMaps');
const Collection = require('../Schemas/Collection');
const requireLogin = require('../requireLogin');

// Move one of the signed-in user's links into (or out of, with an empty
// collectionId) one of their collections.
router.post('/', requireLogin, async (req, res) => {
    const { urlId, collectionId } = req.body;
    const ownerId = req.session.user._id;

    const urlMap = await UrlMap.findOne({ _id: urlId, owner: ownerId });
    if (!urlMap) {
        return res.redirect('/dashboard?error=' + encodeURIComponent('Link not found.'));
    }

    if (collectionId) {
        const collection = await Collection.findOne({ _id: collectionId, owner: ownerId });
        if (!collection) {
            return res.redirect('/dashboard?error=' + encodeURIComponent('Collection not found.'));
        }
        urlMap.collectionId = collection._id;
    } else {
        urlMap.collectionId = null;
    }

    await urlMap.save();
    res.redirect('/dashboard');
});

module.exports = router;
