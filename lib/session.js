/**
 * Signs a user in on a fresh session id. Regenerating defeats session
 * fixation: an id an attacker planted before login is worthless after it.
 * A pending "create this link once I'm signed in" action survives the swap.
 */
function signIn(req, user) {
    const pending = req.session.addUrl;
    return new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) return reject(err);
            req.session.user = { _id: String(user._id), username: user.username };
            if (pending) req.session.addUrl = pending;
            resolve();
        });
    });
}

module.exports = { signIn };
