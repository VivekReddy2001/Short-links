const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const User = require('../Schemas/User');
const resumePendingAction = require('../lib/resumePendingAction');
const { signIn } = require('../lib/session');
const { str } = require('../lib/input');

// A real bcrypt hash of a random string, at the same cost as stored
// passwords. Comparing against it when the username doesn't exist makes a
// failed login take as long as a wrong password, so response times don't
// reveal which usernames are registered.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), Number(process.env.BCRYPT_ROUNDS) || 10);

router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('login', { error: null });
});

router.post('/', async (req, res) => {
    const username = str(req.body.username);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    const user = username ? await User.findOne({ username }) : null;
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !ok) {
        return res.status(401).render('login', { error: 'Wrong username or password.' });
    }

    await signIn(req, user);
    await resumePendingAction(req);
    res.redirect('/dashboard');
});

module.exports = router;
