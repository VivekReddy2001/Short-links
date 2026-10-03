// Gate for actions that normally require a signed-in user (custom aliases,
// saving to a collection, ...). The one exception is the plain "Generate
// Short URL" button on the home page: anyone, logged in or not, can shorten
// a URL that way. Everything else gets bounced to /login, with the form
// data it was about to submit stashed on the session so loginRouter /
// registerRouter can finish the original action once the user is signed in.
module.exports = function requireAuthOrQuickShorten(req, res, next) {
    const body = req.body || {};
    if ((req.session && req.session.user) || body.submit === 'Generate Short URL') {
        return next();
    }
    // Only the fields resumePendingAction needs, never the CSRF token.
    req.session.addUrl = {
        longUrl: body.longUrl,
        customCode: body.customCode,
        description: body.description,
    };
    return res.redirect('/login');
};
