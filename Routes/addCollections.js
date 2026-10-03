const express = require('express');
const router = express.Router();

const Collection = require('../Schemas/Collection');
const requireLogin = require('../lib/requireLogin');
const { str, errorRedirect } = require('../lib/input');

router.post('/', requireLogin, async (req, res) => {
    const name = str(req.body.name).slice(0, 64);
    if (!name) {
        return errorRedirect(res, 'Give the collection a name.');
    }
    try {
        await Collection.create({ name, owner: req.session.user._id });
    } catch (err) {
        if (err.code === 11000) {
            return errorRedirect(res, 'You already have a collection with that name.');
        }
        throw err;
    }
    res.redirect('/dashboard');
});

module.exports = router;
