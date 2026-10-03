const express = require('express');
const router = express.Router();

const Collection = require('../Schemas/Collection');
const UrlMap = require('../Schemas/UrlMaps');
const requireLogin = require('../lib/requireLogin');
const { isObjectId, errorRedirect } = require('../lib/input');

router.use(requireLogin);

// Delete one of the signed-in user's collections. Its links are kept and
// moved back to "Uncategorized" rather than deleted with it.
router.post('/:id/delete', async (req, res) => {
    const ownerId = req.session.user._id;
    if (!isObjectId(req.params.id)) return errorRedirect(res, 'Collection not found.');

    const collection = await Collection.findOneAndDelete({ _id: req.params.id, owner: ownerId });
    if (!collection) return errorRedirect(res, 'Collection not found.');

    await UrlMap.updateMany({ owner: ownerId, collectionId: collection._id }, { $set: { collectionId: null } });
    res.redirect('/dashboard');
});

module.exports = router;
