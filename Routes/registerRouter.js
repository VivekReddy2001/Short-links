const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const User = require('../Schemas/User');
const resumePendingAction = require('../resumePendingAction');

const SALT_ROUNDS = 10;

router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('register', { error: null });
});

router.post('/', async (req, res) => {
    const username = (req.body.username || '').trim();
    const { password } = req.body;

    if (username.length < 3 || !password || password.length < 6) {
        return res.render('register', {
            error: 'Username must be at least 3 characters and password at least 6.',
        });
    }

    const taken = await User.findOne({ username });
    if (taken) {
        return res.render('register', { error: 'That username is already taken.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ username, password: hashed });

    req.session.user = { _id: user._id, username: user.username };
    await resumePendingAction(req);
    res.redirect('/dashboard');
});

module.exports = router;
