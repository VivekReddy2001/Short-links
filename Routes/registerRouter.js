const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const User = require('../Schemas/User');
const resumePendingAction = require('../lib/resumePendingAction');
const { signIn } = require('../lib/session');
const { str } = require('../lib/input');

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('register', { error: null });
});

router.post('/', async (req, res) => {
    const username = str(req.body.username);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    // bcrypt only uses the first 72 bytes of a password; refuse longer ones
    // rather than silently ignoring the rest.
    if (!USERNAME_RE.test(username) || password.length < 8 || Buffer.byteLength(password) > 72) {
        return res.status(400).render('register', {
            error: 'Usernames are 3-32 letters, numbers, dots, dashes or underscores; passwords are 8-72 characters long.',
        });
    }

    if (await User.exists({ username })) {
        return res.status(409).render('register', { error: 'That username is already taken.' });
    }

    let user;
    try {
        user = await User.create({ username, password: await bcrypt.hash(password, SALT_ROUNDS) });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).render('register', { error: 'That username is already taken.' });
        }
        throw err;
    }

    await signIn(req, user);
    await resumePendingAction(req);
    res.redirect('/dashboard');
});

module.exports = router;
