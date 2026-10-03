const express = require('express');
const router = express.Router();

const UrlMap = require('../Schemas/UrlMaps');
const requireLogin = require('../lib/requireLogin');
const { isObjectId, errorRedirect } = require('../lib/input');

router.use(requireLogin);

// Delete one of the signed-in user's links. The short code is freed and can
// be claimed again as a custom alias.
router.post('/:id/delete', async (req, res) => {
    if (!isObjectId(req.params.id)) return errorRedirect(res, 'Link not found.');
    const deleted = await UrlMap.findOneAndDelete({ _id: req.params.id, owner: req.session.user._id });
    if (!deleted) return errorRedirect(res, 'Link not found.');
    res.redirect('/dashboard');
});

module.exports = router;
