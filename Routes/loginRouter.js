const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const User = require('../Schemas/User');
const resumePendingAction = require('../resumePendingAction');

router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('login', { error: null });
});

router.post('/', async (req, res) => {
    const username = (req.body.username || '').trim();
    const { password } = req.body;

    const user = await User.findOne({ username });
    const ok = user && (await bcrypt.compare(password || '', user.password));
    if (!ok) {
        return res.render('login', { error: 'Wrong username or password.' });
    }

    req.session.user = { _id: user._id, username: user.username };
    await resumePendingAction(req);
    res.redirect('/dashboard');
});

module.exports = router;
