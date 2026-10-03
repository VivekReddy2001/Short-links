const express = require('express');
const router = express.Router();

const UrlMap = require('../Schemas/UrlMaps');
const Collection = require('../Schemas/Collection');
const requireLogin = require('../lib/requireLogin');
const { str, isObjectId, errorRedirect } = require('../lib/input');

// Move one of the signed-in user's links into (or out of, with an empty
// collectionId) one of their collections.
router.post('/', requireLogin, async (req, res) => {
    const urlId = str(req.body.urlId);
    const collectionId = str(req.body.collectionId);
    const ownerId = req.session.user._id;

    const urlMap = isObjectId(urlId) && (await UrlMap.findOne({ _id: urlId, owner: ownerId }));
    if (!urlMap) {
        return errorRedirect(res, 'Link not found.');
    }

    if (collectionId) {
        const collection =
            isObjectId(collectionId) && (await Collection.findOne({ _id: collectionId, owner: ownerId }));
        if (!collection) {
            return errorRedirect(res, 'Collection not found.');
        }
        urlMap.collectionId = collection._id;
    } else {
        urlMap.collectionId = null;
    }

    await urlMap.save();
    res.redirect('/dashboard');
});

module.exports = router;
