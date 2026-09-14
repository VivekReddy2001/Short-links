const express = require('express');
const router = express.Router();

const Collection = require('../Schemas/Collection');
const requireLogin = require('../requireLogin');

router.post('/', requireLogin, async (req, res) => {
    const name = (req.body.name || '').trim();
    if (!name) {
        return res.redirect('/dashboard?error=' + encodeURIComponent('Give the collection a name.'));
    }
    try {
        await Collection.create({ name, owner: req.session.user._id });
    } catch (err) {
        if (err.code === 11000) {
            return res.redirect(
                '/dashboard?error=' + encodeURIComponent('You already have a collection with that name.')
            );
        }
        throw err;
    }
    res.redirect('/dashboard');
});

module.exports = router;
