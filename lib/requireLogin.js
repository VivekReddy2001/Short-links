// Plain "you must be signed in" gate, for pages that have no anonymous
// path at all (the dashboard, collections). See requireAuthOrQuickShorten.js
// for the looser gate used by the shortening actions, which lets an
// anonymous "Generate Short URL" submission through.
module.exports = function requireLogin(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
};
