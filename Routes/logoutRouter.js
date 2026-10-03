const express = require('express');
const router = express.Router();

// POST, not GET: a GET logout can be triggered by any page that embeds
// <img src="/logout">. The form in the header carries the CSRF token.
router.post('/', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('shortlinks.sid');
        res.redirect('/');
    });
});

module.exports = router;
